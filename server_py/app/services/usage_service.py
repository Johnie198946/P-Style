"""
用量服务 - 统计用户的分析和生成次数
根据开发方案第 27 节实现
"""
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from ..models import AnalysisTask, Subscription, SubscriptionPlan


class UsageService:
    """用量服务"""

    @staticmethod
    def get_user_usage(db: Session, user_id: int, month: Optional[str] = None, user_role: Optional[str] = None) -> Dict[str, Any]:
        """
        获取用户用量
        根据开发方案，管理员账号不受用量限制，返回 -1 表示无限
        
        Args:
            user_id: 用户 ID
            month: 月份（格式：YYYY-MM），默认当前月
            user_role: 用户角色（"admin" 或 "user"），如果为 "admin" 则返回无限限制
        
        Returns:
            {
                "analysisUsed": int,
                "analysisLimit": int,  # -1 表示无限（管理员）
                "generationUsed": int,
                "generationLimit": int,  # -1 表示无限（管理员）
                "period": str,
            }
        """
        if not month:
            now = datetime.utcnow()
            month = now.strftime("%Y-%m")

        year, month_num = map(int, month.split("-"))
        start_date = datetime(year, month_num, 1)
        if month_num == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month_num + 1, 1)

        # 统计分析次数（Part1+Part2 完成的任务）
        analysis_count = db.query(func.count(AnalysisTask.id)).filter(
            AnalysisTask.user_id == user_id,
            AnalysisTask.status.in_(["part1_completed", "completed"]),
            AnalysisTask.created_at >= start_date,
            AnalysisTask.created_at < end_date,
        ).scalar() or 0

        # 统计生成次数（Part3 成功，即存在 preview_image_url）
        generation_count = db.query(func.count(AnalysisTask.id)).filter(
            AnalysisTask.user_id == user_id,
            AnalysisTask.status == "completed",
            AnalysisTask.structured_result.isnot(None),
            AnalysisTask.created_at >= start_date,
            AnalysisTask.created_at < end_date,
        ).scalar() or 0

        # 获取用户订阅和额度
        # 注意：管理员账号不受用量限制，返回 -1 表示无限
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status == "active",
        ).first()

        analysis_limit = 0
        generation_limit = 0

        if subscription:
            plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription.plan_id).first()
            if plan and plan.features:
                features = plan.features if isinstance(plan.features, dict) else {}
                analysis_limit = features.get("analysis_per_month", 0)
                generation_limit = features.get("generations_per_month", 0)
        
        # 管理员账号：不受用量限制，返回 -1 表示无限
        if user_role == "admin":
            analysis_limit = -1
            generation_limit = -1
        elif analysis_limit == 0 and generation_limit == 0:
            # 如果用户没有订阅，使用免费版默认限制（10次分析，5次生成）
            analysis_limit = 10
            generation_limit = 5

        return {
            "analysisUsed": analysis_count,
            "analysisLimit": analysis_limit,  # -1 表示无限（管理员）
            "generationUsed": generation_count,
            "generationLimit": generation_limit,  # -1 表示无限（管理员）
            "period": month,
        }

    @staticmethod
    def check_usage_limit(db: Session, user_id: int, usage_type: str, user_role: Optional[str] = None) -> tuple[bool, Optional[str]]:
        """
        检查用量是否超限
        根据开发方案，管理员账号不受用量限制，可以无限制使用分析和生成功能
        
        Args:
            user_id: 用户 ID
            usage_type: "analysis" 或 "generation"
            user_role: 用户角色（"admin" 或 "user"），如果为 "admin" 则不受用量限制
        
        Returns:
            (is_allowed, error_code)
        
        Note:
            - 管理员账号（role="admin"）不受用量限制，直接返回 (True, None)
            - 普通用户需要检查用量是否超限
        """
        # 管理员用量限制豁免：管理员账号不受用量限制
        if user_role == "admin":
            return True, None
        
        # 获取用户用量（传入 user_role 以便正确处理管理员和普通用户的限制）
        usage = UsageService.get_user_usage(db, user_id, user_role=user_role)

        if usage_type == "analysis":
            # 如果 analysisLimit 为 0（没有订阅），也允许使用（免费版默认限制）
            if usage["analysisLimit"] > 0 and usage["analysisUsed"] >= usage["analysisLimit"]:
                return False, "USAGE_ANALYSIS_LIMIT_EXCEEDED"
        elif usage_type == "generation":
            # 如果 generationLimit 为 0（没有订阅），也允许使用（免费版默认限制）
            if usage["generationLimit"] > 0 and usage["generationUsed"] >= usage["generationLimit"]:
                return False, "USAGE_GENERATION_LIMIT_EXCEEDED"

        return True, None


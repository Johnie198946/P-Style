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
    def get_user_usage(db: Session, user_id: int, month: Optional[str] = None) -> Dict[str, Any]:
        """
        获取用户用量
        
        Args:
            user_id: 用户 ID
            month: 月份（格式：YYYY-MM），默认当前月
        
        Returns:
            {
                "analysisUsed": int,
                "analysisLimit": int,
                "generationUsed": int,
                "generationLimit": int,
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

        return {
            "analysisUsed": analysis_count,
            "analysisLimit": analysis_limit,
            "generationUsed": generation_count,
            "generationLimit": generation_limit,
            "period": month,
        }

    @staticmethod
    def check_usage_limit(db: Session, user_id: int, usage_type: str) -> tuple[bool, Optional[str]]:
        """
        检查用量是否超限
        
        Args:
            user_id: 用户 ID
            usage_type: "analysis" 或 "generation"
        
        Returns:
            (is_allowed, error_code)
        """
        usage = UsageService.get_user_usage(db, user_id)

        if usage_type == "analysis":
            if usage["analysisUsed"] >= usage["analysisLimit"]:
                return False, "USAGE_ANALYSIS_LIMIT_EXCEEDED"
        elif usage_type == "generation":
            if usage["generationUsed"] >= usage["generationLimit"]:
                return False, "USAGE_GENERATION_LIMIT_EXCEEDED"

        return True, None


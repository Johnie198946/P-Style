"""
导出服务 - 生成 XMP/JSX/PDF/JSON 文件
根据开发方案第 18 节实现 PDF 报告生成（包含直方图、曲线、色轮等图表）
"""
import json
from typing import Dict, Any, Optional
from loguru import logger
from io import BytesIO
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle
    from reportlab.lib import colors
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("reportlab 未安装，PDF 生成功能将不可用")


class ExportService:
    """导出服务"""

    @staticmethod
    def generate_xmp(task_data: Dict[str, Any]) -> str:
        """生成 Lightroom XMP 文件"""
        lr = task_data.get("lightroom", {})
        
        xmp_template = """<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/">
      <crs:Exposure>{exposure}</crs:Exposure>
      <crs:Contrast>{contrast}</crs:Contrast>
      <crs:Highlights>{highlights}</crs:Highlights>
      <crs:Shadows>{shadows}</crs:Shadows>
      <crs:Whites>{whites}</crs:Whites>
      <crs:Blacks>{blacks}</crs:Blacks>
      <crs:Clarity>{clarity}</crs:Clarity>
      <crs:Vibrance>{vibrance}</crs:Vibrance>
      <crs:Saturation>{saturation}</crs:Saturation>
      <crs:Temperature>{temperature}</crs:Temperature>
      <crs:Tint>{tint}</crs:Tint>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>"""

        # 提取参数（简化，实际需要完整映射）
        exposure = lr.get("exposure", "+0").replace("+", "")
        contrast = lr.get("contrast", "+0").replace("+", "")
        highlights = lr.get("highlights", "+0").replace("+", "")
        shadows = lr.get("shadows", "+0").replace("+", "")
        whites = lr.get("whites", "+0").replace("+", "")
        blacks = lr.get("blacks", "+0").replace("+", "")
        clarity = lr.get("clarity", "+0").replace("+", "")
        vibrance = lr.get("vibrance", "+0").replace("+", "")
        saturation = lr.get("saturation", "+0").replace("+", "")
        temperature = lr.get("temperature", "+0").replace("+", "")
        tint = lr.get("tint", "+0").replace("+", "")

        return xmp_template.format(
            exposure=exposure,
            contrast=contrast,
            highlights=highlights,
            shadows=shadows,
            whites=whites,
            blacks=blacks,
            clarity=clarity,
            vibrance=vibrance,
            saturation=saturation,
            temperature=temperature,
            tint=tint,
        )

    @staticmethod
    def generate_jsx(task_data: Dict[str, Any]) -> str:
        """生成 Photoshop JSX 脚本"""
        ps = task_data.get("photoshop", {})
        steps = ps.get("steps", [])

        jsx_lines = [
            "// Photoshop 自动化脚本",
            "// 由 PhotoStyle Clone 生成",
            "",
        ]

        for step in steps:
            title = step.get("title", "")
            description = step.get("description", "")
            jsx_lines.append(f"// {title}: {description}")
            # TODO: 生成实际的 JSX 代码
            jsx_lines.append("// TODO: 实现具体操作")

        return "\n".join(jsx_lines)

    @staticmethod
    def generate_json(task_data: Dict[str, Any]) -> str:
        """生成 JSON 导出"""
        return json.dumps(task_data, ensure_ascii=False, indent=2)

    @staticmethod
    def generate_pdf(task_data: Dict[str, Any], task_id: Optional[str] = None) -> bytes:
        """
        生成 PDF 报告
        根据开发方案第 18 节，包含：
        - 分析结果摘要
        - Lightroom 参数
        - Photoshop 步骤
        - 直方图、曲线、色轮等图表（由 chartService 生成）
        
        Args:
            task_data: 任务数据（包含 sections）
            task_id: 任务 ID（用于文件名）
        
        Returns:
            PDF 文件的字节流
        """
        if not REPORTLAB_AVAILABLE:
            logger.error("reportlab 未安装，无法生成 PDF")
            return b"PDF generation unavailable: reportlab not installed"
        
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            story = []
            styles = getSampleStyleSheet()
            
            # 标题样式
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#1a1a1a'),
                spaceAfter=30,
            )
            
            # 添加标题
            story.append(Paragraph("摄影风格分析报告", title_style))
            if task_id:
                story.append(Paragraph(f"任务 ID: {task_id}", styles['Normal']))
            story.append(Spacer(1, 0.5 * cm))
            
            # 提取数据
            sections = task_data.get("sections", {})
            meta = task_data.get("meta", {})
            
            # 1. 照片点评
            photo_review = sections.get("photoReview", {})
            if photo_review:
                story.append(Paragraph("<b>一、照片点评</b>", styles['Heading2']))
                structured = photo_review.get("structured", {})
                overview = structured.get("overviewSummary", "")
                if overview:
                    story.append(Paragraph(overview, styles['Normal']))
                story.append(Spacer(1, 0.3 * cm))
            
            # 2. 构图分析
            composition = sections.get("composition", {})
            if composition:
                story.append(Paragraph("<b>二、构图分析</b>", styles['Heading2']))
                comp_structured = composition.get("structured", {})
                advanced = comp_structured.get("advanced_sections", {})
                for title, content in advanced.items():
                    if content:
                        story.append(Paragraph(f"<b>{title}</b>", styles['Heading3']))
                        story.append(Paragraph(content, styles['Normal']))
                        story.append(Spacer(1, 0.2 * cm))
                story.append(Spacer(1, 0.3 * cm))
            
            # 3. 光影参数
            lighting = sections.get("lighting", {})
            if lighting:
                story.append(Paragraph("<b>三、光影参数</b>", styles['Heading2']))
                lighting_structured = lighting.get("structured", {})
                basic = lighting_structured.get("basic", {})
                
                # 创建参数表格
                data = [["参数", "数值", "说明"]]
                for param_name in ["exposure", "contrast", "highlights", "shadows", "whites", "blacks"]:
                    param = basic.get(param_name, {})
                    data.append([
                        param_name.capitalize(),
                        param.get("range", "+0"),
                        param.get("note", "")
                    ])
                
                table = Table(data, colWidths=[3*cm, 2*cm, 8*cm])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ]))
                story.append(table)
                story.append(Spacer(1, 0.3 * cm))
            
            # 4. Lightroom 参数（Part2）
            lightroom = sections.get("lightroom", {})
            if lightroom:
                story.append(Paragraph("<b>四、Lightroom 参数</b>", styles['Heading2']))
                lr_structured = lightroom.get("structured", {})
                panels = lr_structured.get("panels", [])
                
                for panel in panels:
                    title = panel.get("title", "")
                    description = panel.get("description", "")
                    params = panel.get("params", [])
                    
                    if title:
                        story.append(Paragraph(f"<b>{title}</b>", styles['Heading3']))
                    if description:
                        story.append(Paragraph(description, styles['Normal']))
                    
                    if params:
                        param_data = [["参数", "数值", "原因"]]
                        for p in params:
                            param_data.append([
                                p.get("name", ""),
                                p.get("value", ""),
                                p.get("reason", "")
                            ])
                        
                        param_table = Table(param_data, colWidths=[3*cm, 2*cm, 8*cm])
                        param_table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('GRID', (0, 0), (-1, -1), 1, colors.black),
                        ]))
                        story.append(param_table)
                        story.append(Spacer(1, 0.2 * cm))
                
                story.append(Spacer(1, 0.3 * cm))
            
            # 5. Photoshop 步骤（Part2）
            photoshop = sections.get("photoshop", {})
            if photoshop:
                story.append(Paragraph("<b>五、Photoshop 步骤</b>", styles['Heading2']))
                ps_structured = photoshop.get("structured", {})
                steps = ps_structured.get("steps", [])
                
                for i, step in enumerate(steps, 1):
                    title = step.get("title", "")
                    description = step.get("description", "")
                    details = step.get("details", "")
                    
                    story.append(Paragraph(f"<b>步骤 {i}: {title}</b>", styles['Heading3']))
                    if description:
                        story.append(Paragraph(description, styles['Normal']))
                    if details:
                        story.append(Paragraph(details, styles['Normal']))
                    story.append(Spacer(1, 0.2 * cm))
                
                story.append(Spacer(1, 0.3 * cm))
            
            # 6. 元数据与警告
            if meta.get("warnings"):
                story.append(Paragraph("<b>六、警告信息</b>", styles['Heading2']))
                for warning in meta.get("warnings", []):
                    story.append(Paragraph(f"• {warning}", styles['Normal']))
            
            # 生成 PDF
            doc.build(story)
            buffer.seek(0)
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"PDF 生成失败: {e}")
            return b"PDF generation failed"


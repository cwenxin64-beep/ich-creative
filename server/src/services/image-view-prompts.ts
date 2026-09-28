export type ReferenceView = 'side' | 'detail';

export function buildReferenceViewPrompt(prompt: string, view: ReferenceView): string {
  const identityRequirement =
    '参考图中的产品是唯一主体。保持同一件产品的品类、造型、结构、比例、材质、颜色、纹样和装饰，不要重新设计，不要替换成相似产品。';
  const viewRequirement = view === 'side'
    ? [
        '生成同一产品的侧后方三分之二视图。',
        '把产品相对参考图明确旋转约60度，必须同时看见正面的一小部分、侧边厚度和背面轮廓，透视关系清楚。',
        '完整产品保留在画面内。禁止正面平视、禁止沿用参考图机位、禁止只做缩放或裁切。',
      ].join('\n')
    : [
        '生成同一产品的局部微距细节图。',
        '镜头贴近产品，只展示约四分之一到三分之一的局部，重点呈现纹样、材质肌理、边缘结构和制作工艺。',
        '局部必须铺满画面。禁止展示完整产品、禁止正面全景、禁止沿用参考图构图。',
      ].join('\n');

  return `${identityRequirement}\n${viewRequirement}\n${prompt}`;
}

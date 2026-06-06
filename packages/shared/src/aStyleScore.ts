export type AStyleScoreItem =
  | "交易制度相似度"
  | "板块轮动相似度"
  | "龙头/中军/后排结构"
  | "T+1与涨跌停体验"
  | "主力与量化博弈"
  | "情绪弹幕与人气标签"
  | "新手学习完整度"
  | "合规隔离";

export interface AStyleScoreCriterion {
  item: AStyleScoreItem;
  maxScore: number;
  description: string;
}

export interface AStyleScore {
  totalScore: number;
  criteria: AStyleScoreCriterion[];
  beginnerLearningChecklist: string[];
}

export const A_STYLE_SCORE: AStyleScore = {
  totalScore: 100,
  criteria: [
    {
      item: "交易制度相似度",
      maxScore: 15,
      description: "集合竞价、T+1、涨跌停、阶段推进等规则体验是否清晰。"
    },
    {
      item: "板块轮动相似度",
      maxScore: 15,
      description: "五行板块热度、主线退潮、防守吸血和暗线启动是否能被玩家感知。"
    },
    {
      item: "龙头/中军/后排结构",
      maxScore: 12,
      description: "板块内部角色是否能体现情绪、承接、弹性和回撤风险。"
    },
    {
      item: "T+1与涨跌停体验",
      maxScore: 12,
      description: "锁仓、排队、炸板、跌停受限等体验是否能形成可复盘事件。"
    },
    {
      item: "主力与量化博弈",
      maxScore: 12,
      description: "主力只能影响部分因子，量化会关注拥挤与低流动性目标。"
    },
    {
      item: "情绪弹幕与人气标签",
      maxScore: 10,
      description: "人气龙、领涨龙、弹幕龙等标签是否区分关注度与带动能力。"
    },
    {
      item: "新手学习完整度",
      maxScore: 14,
      description: "是否包含教学模式、术语解释、局后复盘、亏损原因解释和安全表述。"
    },
    {
      item: "合规隔离",
      maxScore: 10,
      description: "是否保持虚构市场、匿名模板、无真实行情和无真实证券交易。"
    }
  ],
  beginnerLearningChecklist: [
    "是否有教学模式",
    "是否有术语解释",
    "是否有局后复盘",
    "是否能解释玩家亏损原因",
    "是否避免投资导向表述"
  ]
};

export function getAStyleScoreCriterion(item: AStyleScoreItem): AStyleScoreCriterion | undefined {
  return A_STYLE_SCORE.criteria.find((criterion) => criterion.item === item);
}

import type {
  ElementSectorState,
  ElementSectorTemplate,
  ElementType,
  GameRoomType,
  GameMode,
  NayinPersonality,
  NayinStockTemplate,
  StockMarketState
} from "../types";
import { getRoomTypeConfig } from "../roomTypes";

const PERSONALITY_DEFAULTS: Record<
  NayinPersonality,
  Pick<NayinStockTemplate, "baseVolatility" | "baseLiquidity" | "baseRegulationSensitivity" | "baseSectorBeta">
> = {
  潜伏: { baseVolatility: 35, baseLiquidity: 48, baseRegulationSensitivity: 35, baseSectorBeta: 52 },
  龙头: { baseVolatility: 72, baseLiquidity: 78, baseRegulationSensitivity: 70, baseSectorBeta: 88 },
  中军: { baseVolatility: 42, baseLiquidity: 86, baseRegulationSensitivity: 42, baseSectorBeta: 76 },
  后排: { baseVolatility: 68, baseLiquidity: 36, baseRegulationSensitivity: 56, baseSectorBeta: 82 },
  妖股: { baseVolatility: 92, baseLiquidity: 52, baseRegulationSensitivity: 85, baseSectorBeta: 92 },
  防守: { baseVolatility: 24, baseLiquidity: 72, baseRegulationSensitivity: 24, baseSectorBeta: 38 },
  暗线: { baseVolatility: 48, baseLiquidity: 46, baseRegulationSensitivity: 48, baseSectorBeta: 58 },
  轮动: { baseVolatility: 55, baseLiquidity: 58, baseRegulationSensitivity: 45, baseSectorBeta: 66 },
  趋势: { baseVolatility: 45, baseLiquidity: 68, baseRegulationSensitivity: 38, baseSectorBeta: 72 },
  横盘: { baseVolatility: 18, baseLiquidity: 62, baseRegulationSensitivity: 22, baseSectorBeta: 32 },
  高位: { baseVolatility: 78, baseLiquidity: 58, baseRegulationSensitivity: 78, baseSectorBeta: 84 },
  启动: { baseVolatility: 58, baseLiquidity: 62, baseRegulationSensitivity: 50, baseSectorBeta: 74 },
  弱转强: { baseVolatility: 70, baseLiquidity: 56, baseRegulationSensitivity: 62, baseSectorBeta: 80 },
  跟风: { baseVolatility: 50, baseLiquidity: 44, baseRegulationSensitivity: 36, baseSectorBeta: 68 },
  信息: { baseVolatility: 44, baseLiquidity: 50, baseRegulationSensitivity: 46, baseSectorBeta: 55 }
};

function stock(id: string, name: string, element: ElementType, personality: NayinPersonality): NayinStockTemplate {
  return {
    id,
    name,
    element,
    personality,
    ...PERSONALITY_DEFAULTS[personality]
  };
}

export const ELEMENT_SECTOR_TEMPLATES: ElementSectorTemplate[] = [
  {
    element: "金",
    name: "金系板块",
    description: "锋利、审判、强攻、封板与砸盘都很硬。",
    styleTags: ["裁决", "锋利", "封板", "监管敏感"],
    nayinPool: [
      stock("metal-hai-zhong-jin", "海中金", "金", "潜伏"),
      stock("metal-jian-feng-jin", "剑锋金", "金", "龙头"),
      stock("metal-bai-la-jin", "白蜡金", "金", "中军"),
      stock("metal-sha-zhong-jin", "沙中金", "金", "后排"),
      stock("metal-jin-bo-jin", "金箔金", "金", "妖股"),
      stock("metal-chai-chuan-jin", "钗钏金", "金", "防守")
    ]
  },
  {
    element: "木",
    name: "木系板块",
    description: "成长、趋势、承接与修复，适合慢慢发育。",
    styleTags: ["成长", "趋势", "发育", "修复"],
    nayinPool: [
      stock("wood-da-lin-mu", "大林木", "木", "龙头"),
      stock("wood-yang-liu-mu", "杨柳木", "木", "轮动"),
      stock("wood-song-bai-mu", "松柏木", "木", "中军"),
      stock("wood-ping-di-mu", "平地木", "木", "防守"),
      stock("wood-sang-zhe-mu", "桑柘木", "木", "趋势"),
      stock("wood-shi-liu-mu", "石榴木", "木", "后排")
    ]
  },
  {
    element: "水",
    name: "水系板块",
    description: "信息流动、暗线轮动、真假难辨。",
    styleTags: ["暗线", "流动", "反转", "洗盘"],
    nayinPool: [
      stock("water-jian-xia-shui", "涧下水", "水", "暗线"),
      stock("water-quan-zhong-shui", "泉中水", "水", "信息"),
      stock("water-chang-liu-shui", "长流水", "水", "中军"),
      stock("water-tian-he-shui", "天河水", "水", "妖股"),
      stock("water-da-xi-shui", "大溪水", "水", "轮动"),
      stock("water-da-hai-shui", "大海水", "水", "龙头")
    ]
  },
  {
    element: "火",
    name: "火系板块",
    description: "情绪爆发、涨停冲锋、炸板也最狠。",
    styleTags: ["爆发", "涨停", "炸板", "情绪"],
    nayinPool: [
      stock("fire-lu-zhong-huo", "炉中火", "火", "启动"),
      stock("fire-shan-tou-huo", "山头火", "火", "龙头"),
      stock("fire-pi-li-huo", "霹雳火", "火", "妖股"),
      stock("fire-shan-xia-huo", "山下火", "火", "暗线"),
      stock("fire-fu-deng-huo", "覆灯火", "火", "弱转强"),
      stock("fire-tian-shang-huo", "天上火", "火", "高位")
    ]
  },
  {
    element: "土",
    name: "土系板块",
    description: "防守承接、稳盘护盘，适合退潮时避险。",
    styleTags: ["防守", "承接", "稳盘", "护盘"],
    nayinPool: [
      stock("earth-lu-pang-tu", "路旁土", "土", "跟风"),
      stock("earth-cheng-tou-tu", "城头土", "土", "防守"),
      stock("earth-wu-shang-tu", "屋上土", "土", "防守"),
      stock("earth-bi-shang-tu", "壁上土", "土", "横盘"),
      stock("earth-da-yi-tu", "大驿土", "土", "轮动"),
      stock("earth-sha-zhong-tu", "沙中土", "土", "后排")
    ]
  }
];

export const NAYIN_DANMAKU_LINES: Record<ElementType, string[]> = {
  金: ["金系开刃了，封板像砍瓜。", "剑锋金太硬了，小心监管盯上。", "金系人气又起来了，韭菜开始磨刀。"],
  木: ["木系开始发芽，趋势慢慢长出来了。", "松柏木还稳着，别急着割。", "大林木一动，板块像长了腿。"],
  水: ["水系暗线开始流动，谁在偷偷低吸？", "涧下水没声音，但可能有东西。", "长流水稳住了，资金像没走。"],
  火: ["火系点燃了，韭菜开始上头。", "霹雳火拉太猛，小心炸成烟花。", "天上火这么高，监管快抬头了。"],
  土: ["土系开始护盘，退潮时还得看它。", "城头土守住了，板块暂时没塌。", "土系不猛，但活得久。"]
};

export function getNayinStockTemplates(): NayinStockTemplate[] {
  return ELEMENT_SECTOR_TEMPLATES.flatMap((sector) => sector.nayinPool.map((item) => ({ ...item })));
}

export function createStockMarketState(template: NayinStockTemplate, price = 100): StockMarketState {
  return {
    id: template.id,
    templateId: template.id,
    name: template.name,
    element: template.element,
    currentPrice: price,
    previousClose: price,
    changePercent: 0,
    danmakuHeat: 0,
    viewCountScore: 0,
    holderCountScore: 0,
    moneyFlowScore: 0,
    crowdedness: 0,
    tPlusOneCrowdedness: 0,
    quantAttention: 0,
    regulationAttention: 0,
    liquidity: template.baseLiquidity,
    volatility: template.baseVolatility,
    sectorBeta: template.baseSectorBeta,
    isLimitUp: false,
    isLimitDown: false,
    boardStrength: 0,
    boardBreakRisk: 0,
    tags: []
  };
}

export function createFullMarketSectors(): ElementSectorState[] {
  return ELEMENT_SECTOR_TEMPLATES.map((sector) => ({
    element: sector.element,
    name: sector.name,
    heat: 0,
    flow: 0,
    resonance: 0,
    risk: 0,
    popularityScore: 0,
    strengthScore: 0,
    moneyFlowScore: 0,
    riskScore: 0,
    resonanceScore: 0,
    statusTags: [],
    stocks: sector.nayinPool.map((template) => createStockMarketState(template))
  }));
}

export function createMarketSectorsForMode(mode: GameMode): ElementSectorState[] {
  const full = createFullMarketSectors();
  if (mode === "FULL_MARKET") {
    return full;
  }

  const sectorLimit = mode === "STANDARD" ? 3 : 1;
  const stockLimit = mode === "STANDARD" ? 3 : 3;
  return full.slice(0, sectorLimit).map((sector) => ({
    ...sector,
    stocks: sector.stocks.slice(0, stockLimit)
  }));
}

export function createMarketSectorsForRoomType(roomType: GameRoomType): ElementSectorState[] {
  const config = getRoomTypeConfig(roomType);
  const full = createFullMarketSectors().slice(0, config.sectorCount);

  if (config.stockPoolMode === "NINE_STOCKS") {
    return full.map((sector) => ({
      ...sector,
      stocks: sector.stocks.slice(0, 3)
    }));
  }

  return full
    .map((sector) => {
      return {
        ...sector,
        stocks: sector.stocks.slice(0, Math.ceil(config.stockCount / config.sectorCount))
      };
    })
    .filter((sector) => sector.stocks.length > 0);
}

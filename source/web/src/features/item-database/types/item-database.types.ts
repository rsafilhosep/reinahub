export type ItemFutureData = {
  market: null;
  priceHistory: [];
  sellerNpcs: [];
  buyerNpcs: [];
  quests: [];
  imbuements: [];
  bestiary: null;
  charms: [];
  crafts: [];
  trade: null;
  statistics: null;
};

export type ItemAssetInfo = {
  path: string;
  exists: boolean;
};

export type ItemDroppedByMonster = {
  monsterName: string;
  normalizedName: string;
  experience: number | null;
  health: number | null;
  imagePath: string;
  hasImage: boolean;
  chance: number | null;
  maxCount: number | null;
};

export type ItemNpcTradeReference = {
  npcName: string;
  normalizedName: string;
  city: string | null;
  price: number | null;
  tradeType: "buy" | "sell";
  npcHref: string;
};

export type ItemDatabaseRecord = {
  id: number;
  name: string;
  clientId: number | null;
  npcPrice: number | null;
  category: string;
  slot: string | null;
  weaponType: string | null;
  classificationConfidence: string;
  image: ItemAssetInfo;
  droppedBy: ItemDroppedByMonster[];
  droppedByCount: number;
  boughtByNpcs: ItemNpcTradeReference[];
  soldByNpcs: ItemNpcTradeReference[];
  boughtByNpcCount: number;
  soldByNpcCount: number;
  future: ItemFutureData;
};

export type ItemSearchResult = {
  id: number;
  name: string;
  clientId: number | null;
  npcPrice: number | null;
  category: string;
  slot: string | null;
  weaponType: string | null;
  classificationConfidence: string;
  image: ItemAssetInfo;
};

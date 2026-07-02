export type NpcFutureData = {
  city: null;
  coordinates: null;
  map: null;
  travel: [];
  quests: [];
  bless: null;
  promotion: null;
  boat: null;
  carpet: null;
  bank: null;
  mail: null;
  guild: null;
  outfits: [];
  mounts: [];
  imbuements: [];
  forge: null;
  dailyTasks: [];
};

export type NpcAssetInfo = {
  path: string;
  exists: boolean;
};

export type NpcLocationInfo = {
  city: string | null;
  coordinates: string | null;
};

export type NpcRelatedItem = {
  itemId: number | null;
  itemName: string;
  price: number | null;
  imagePath: string;
  hasImage: boolean;
  itemHref: string | null;
};

export type NpcHubRecord = {
  name: string;
  normalizedName: string;
  image: NpcAssetInfo;
  location: NpcLocationInfo;
  itemsBought: NpcRelatedItem[];
  itemsSold: NpcRelatedItem[];
  itemsBoughtCount: number;
  itemsSoldCount: number;
  future: NpcFutureData;
};

export type NpcSearchResult = {
  name: string;
  normalizedName: string;
  image: NpcAssetInfo;
  city: string | null;
  itemsBoughtCount: number;
  itemsSoldCount: number;
};

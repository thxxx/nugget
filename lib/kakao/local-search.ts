import { getExternalPlaceKey } from "@/lib/kakao/place-key";

type KakaoLocalSearchDocument = {
  id: string;
  place_name: string;
  category_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
};

export function toSearchPlaceItems(items: KakaoLocalSearchDocument[]) {
  return items.map((item) => {
    const longitude = Number(item.x);
    const latitude = Number(item.y);

    return {
      externalPlaceKey: getExternalPlaceKey({
        id: item.id,
        title: item.place_name,
        roadAddress: item.road_address_name,
        x: longitude,
        y: latitude,
      }),
      title: item.place_name,
      category: item.category_name,
      address: item.address_name,
      roadAddress: item.road_address_name,
      telephone: item.phone,
      link: item.place_url,
      rawMapx: longitude,
      rawMapy: latitude,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    };
  });
}

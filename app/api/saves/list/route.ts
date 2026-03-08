import { jsonError, jsonOk } from "@/lib/http";
import { isUuid, toErrorMessage } from "@/lib/server/helpers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { SaveListItem } from "@/lib/types/domain";

type SaveSort = "latest" | "name";

function getSortValue(value: string | null): SaveSort {
  if (value === "name") {
    return "name";
  }

  return "latest";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim() ?? "";
    const sort = getSortValue(searchParams.get("sort"));

    if (!isUuid(userId)) {
      return jsonError("INVALID_USER", "userId 형식이 올바르지 않습니다.", 400);
    }

    const supabase = createServiceRoleClient();

    const { data: saves, error: savesError } = await supabase
      .from("place_saves")
      .select("id,place_id,memo,visit_status,tags,is_public,rating,created_at,updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (savesError) {
      return jsonError("DB_ERROR", savesError.message, 500);
    }

    if (!saves?.length) {
      return jsonOk({ items: [] });
    }

    const placeIds = saves.map((save) => save.place_id);
    const { data: places, error: placesError } = await supabase
      .from("places")
      .select(
        "id,external_place_key,name,category,road_address,jibun_address,latitude,longitude",
      )
      .in("id", placeIds);

    if (placesError) {
      return jsonError("DB_ERROR", placesError.message, 500);
    }

    const placeMap = new Map((places ?? []).map((place) => [place.id, place]));

    let items: SaveListItem[] = saves
      .map((save) => {
        const place = placeMap.get(save.place_id);
        if (!place) {
          return null;
        }

        return {
          saveId: save.id,
          memo: save.memo,
          visitStatus: save.visit_status === "visited" ? "visited" : "planned",
          tags: Array.isArray(save.tags) ? save.tags.filter((tag) => typeof tag === "string") : [],
          isPublic: save.is_public === true,
          rating: save.rating === 1 || save.rating === 2 || save.rating === 3 ? save.rating : 3,
          createdAt: save.created_at,
          updatedAt: save.updated_at,
          place: {
            placeId: place.id,
            externalPlaceKey: place.external_place_key,
            name: place.name,
            category: place.category,
            roadAddress: place.road_address,
            jibunAddress: place.jibun_address,
            latitude: Number(place.latitude),
            longitude: Number(place.longitude),
          },
        };
      })
      .filter((item): item is SaveListItem => Boolean(item));

    if (sort === "name") {
      items = items.sort((a, b) => a.place.name.localeCompare(b.place.name));
    }

    return jsonOk({ items });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}

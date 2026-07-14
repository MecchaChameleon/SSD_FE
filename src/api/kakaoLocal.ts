export type KakaoPlace={id:string;name:string;roadAddress:string;lotAddress:string;latitude:number;longitude:number};

type KakaoKeywordDocument={id:string;place_name:string;road_address_name:string;address_name:string;x:string;y:string};
type KakaoKeywordResponse={documents:KakaoKeywordDocument[]};

const restApiKey=process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY??'';

export async function searchKakaoPlaces(query:string,signal?:AbortSignal):Promise<KakaoPlace[]>{
  const keyword=query.trim();
  if(!keyword)return [];
  if(!restApiKey)throw new Error('카카오 REST API 키가 설정되지 않았습니다.');
  const params=new URLSearchParams({query:keyword,size:'15'});
  const response=await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`,{
    headers:{Authorization:`KakaoAK ${restApiKey}`},
    signal,
  });
  if(!response.ok)throw new Error(`카카오 매장 검색에 실패했습니다. (${response.status})`);
  const payload=await response.json() as KakaoKeywordResponse;
  return payload.documents.map(place=>({
    id:place.id,
    name:place.place_name,
    roadAddress:place.road_address_name||place.address_name,
    lotAddress:place.address_name,
    latitude:Number(place.y),
    longitude:Number(place.x),
  }));
}

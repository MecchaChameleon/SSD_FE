import type { Product } from '../components/home';

export const mockBuyerProducts: Product[] = [
  {id:1,title:'제주 흑돼지 모둠 프리미엄 세트',discount:'62.5%',shop:'춘자네 흑돼지 협재점',location:'제주시 한림읍 · 850m',detail:'당일 재고 · 마감 22:00',insight:'지금 구매하면 가장 할인율이 높아요.',original:'20,000원',price:'7,500원',remaining:'잔여수량 2개',urgent:true},
  {id:2,title:'바다 전망 커플룸 당일 숙박권',discount:'20%',shop:'푸른바다 게스트하우스',location:'제주시 애월읍 · 2.4km',detail:'당일 공실 · 마감 23:00',insight:'주변 숙박 수요 대비 합리적인 가격이에요.',original:'90,000원',price:'72,000원',remaining:'잔여수량 1개'},
];

export const mockSellerReservations = [
  {id:1,title:'흑돼지 도시락',detail:'당일 재고 · 마감 22:00',original:'12,000원',price:'15,000원',remaining:'잔여수량 5개',quantity:2,time:'16:00',state:'request' as const},
  {id:2,title:'흑돼지 도시락',detail:'당일 재고 · 마감 22:00',original:'12,000원',price:'15,000원',remaining:'잔여수량 5개',quantity:1,time:'16:00',state:'request' as const},
  {id:3,title:'게스트하우스 당일 공실',detail:'당일 공실 · 마감 23:00',original:'70,000원',price:'57,900원',remaining:'잔여수량 1개',quantity:1,time:'21:00',state:'request' as const},
  {id:4,title:'카페 창가 빈 좌석 2인',detail:'빈 시간대 자원 · 마감 22:00',original:'',price:'',remaining:'',quantity:1,time:'19:00',state:'confirmed' as const},
  {id:5,title:'전기자전거 렌탈 잔여분',detail:'이동 및 관광 상품 · 마감 22:00',original:'',price:'',remaining:'',quantity:1,time:'20:00',state:'noshow' as const},
];

export const mockRegisteredProducts = [
  {id:1,name:'흑돼지 도시락',category:'음식점',type:'당일 재고',quantity:'7',regular:'20,000',minimum:'13,000',start:'오후 5:00',end:'오후 10:00',location:'춘자네 흑돼지',status:'판매중',reservations:2},
  {id:2,name:'게스트하우스 당일 공실',category:'숙박',type:'당일 공실',quantity:'1',regular:'70,000',minimum:'50,000',start:'오후 3:00',end:'오후 11:00',location:'푸른바다 게스트하우스',status:'판매중',reservations:1},
  {id:3,name:'제주 갈치살 세트',category:'음식점',type:'당일 재고',quantity:'4',regular:'35,000',minimum:'25,000',start:'오후 3:00',end:'오후 10:00',location:'춘자네 흑돼지',status:'판매종료',reservations:0},
];

export const mockSales = [
  {id:1,name:'제주 갈치살 세트',detail:'당일 재고 · 마감 21:00',quantity:4,revenue:106000},
  {id:2,name:'게스트하우스 당일 공실',detail:'당일 공실 · 마감 21:00',quantity:1,revenue:57900},
];

export const mockFavoriteProducts = [
  {id:1,title:'제주 흑돼지 모둠 프리미엄 세트',discount:'62.5%',shop:'춘자네 흑돼지 협재점',location:'제주시 한림읍 · 850m',original:'20,000원',price:'7,500원',remaining:'잔여수량 2개'},
  {id:2,title:'바다 전망 커플룸 당일 숙박권',discount:'20%',shop:'푸른바다 게스트하우스',location:'제주시 애월읍 · 2.4km',original:'90,000원',price:'72,000원',remaining:'잔여수량 1개'},
];

export const mockLocations=['동문시장 한라봉집','제주시 중앙로 12','서귀포 바다점'];
export const mockBusiness={shop:'춘자네 흑돼지 협재점',number1:'120',number2:'23',number3:'45678',address:'제주시 한림읍 한림로 341',bank:'제주은행',account:'123-04-0567890'};
export const mockAddresses=[['63011','제주특별자치도 제주시 한림읍 한림로 341','제주특별자치도 제주시 한림읍 협재리 2446-2'],['63024','제주특별자치도 제주시 한림읍 귀덕3길','제주특별자치도 제주시 귀덕리 1249-1']];
export const mockBanks=['NH농협','KB국민','카카오뱅크','신한은행','우리은행','하나은행','새마을금고','토스뱅크','IBK기업'];

export const mockSellerNotices=[{id:1,title:'새로운 예약 요청이 들어왔습니다!',body:'[흑돼지 도시락] 상품 2개 예약 요청이 있습니다.',date:'2026.07.11 · 오후 6:15',unread:true,kind:'reservation' as const},{id:2,title:'AI 실시간 할인가 변동 제안',body:'추천 할인가를 확인해 보세요.',date:'2026.07.11 · 오후 6:02',unread:false,kind:'ai' as const}];
export const mockBuyerNotices=[{id:1,title:'예약이 승인되었습니다.',body:'당일 공실 예약이 승인되었습니다.',date:'2026.07.11 · 오후 5:40',unread:true,kind:'product' as const},{id:2,title:'찜 상품 마감임박!',body:'판매 시간이 얼마 남지 않았어요.',date:'2026.07.10 · 오후 9:30',unread:false,kind:'product' as const}];

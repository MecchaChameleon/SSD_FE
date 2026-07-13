import type { Product } from '../components/home';

export const mockBuyerProducts: Product[] = [
  {id:1,title:'제주 흑돼지 모둠 프리미엄 세트',discount:'62.5%',shop:'춘자네 흑돼지 협재점',location:'제주시 한림읍 · 850m',detail:'당일 재고 · 마감 22:00',insight:'지금 구매하면 가장 할인율이 높아요.',original:'20,000원',price:'7,500원',remaining:'잔여수량 2개',urgent:true},
  {id:2,title:'바다 전망 커플룸 당일 숙박권',discount:'20%',shop:'푸른바다 게스트하우스',location:'제주시 애월읍 · 2.4km',detail:'당일 공실 · 마감 23:00',insight:'주변 숙박 수요 대비 합리적인 가격이에요.',original:'90,000원',price:'72,000원',remaining:'잔여수량 1개'},
];

export const mockSellerReservations = [];

export const mockRegisteredProducts = [
  {id:1,name:'흑돼지 도시락',category:'음식점',type:'당일 재고',quantity:'7',regular:'20,000',minimum:'13,000',start:'오후 5:00',end:'오후 10:00',location:'춘자네 흑돼지',status:'판매중',reservations:2},
  {id:2,name:'게스트하우스 당일 공실',category:'숙박',type:'당일 공실',quantity:'1',regular:'70,000',minimum:'50,000',start:'오후 3:00',end:'오후 11:00',location:'푸른바다 게스트하우스',status:'판매중',reservations:1},
  {id:3,name:'제주 갈치살 세트',category:'음식점',type:'당일 재고',quantity:'4',regular:'35,000',minimum:'25,000',start:'오후 3:00',end:'오후 10:00',location:'춘자네 흑돼지',status:'판매종료',reservations:0},
];

export const mockSales = [
  {id:1,name:'제주 갈치살 세트',detail:'당일 재고 · 마감 21:00',quantity:4,revenue:106000},
  {id:2,name:'게스트하우스 당일 공실',detail:'당일 공실 · 마감 21:00',quantity:1,revenue:57900},
];

export const mockFavoriteProducts = [];

export const mockLocations=['동문시장 한라봉집','제주시 중앙로 12','서귀포 바다점'];
export const mockBusiness={shop:'춘자네 흑돼지 협재점',number1:'120',number2:'23',number3:'45678',address:'제주시 한림읍 한림로 341',bank:'제주은행',account:'123-04-0567890'};
export const mockAddresses=[['63011','제주특별자치도 제주시 한림읍 한림로 341','제주특별자치도 제주시 한림읍 협재리 2446-2'],['63024','제주특별자치도 제주시 한림읍 귀덕3길','제주특별자치도 제주시 귀덕리 1249-1']];
export const mockBanks=['NH농협','KB국민','카카오뱅크','신한은행','우리은행','하나은행','새마을금고','토스뱅크','IBK기업'];

export const mockSellerNotices=[];
export const mockBuyerNotices=[];

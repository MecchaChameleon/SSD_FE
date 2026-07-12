import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader, BottomNavigation } from '../components/home';
import { ActionButton, Toggle } from '../components/ui';
import { colors, radius } from '../theme';
import { ApiError, SellerProfile, authApi, buyerApi, notificationApi, sellerApi } from '../api';
import { mockAddresses, mockBanks, mockBusiness, mockFavoriteProducts } from '../mocks/data';
import ChevronDown from '../../icon/chevron_down.svg';
import ChevronLeft from '../../icon/chevron_left.svg';
import ChevronRight from '../../icon/chevron_right.svg';
import HeartIcon from '../../icon/heart.svg';
import UserIcon from '../../icon/user.svg';
import Character from '../../icon/로컬타임_캐릭터 1.svg';
import KakaoLogo from '../../icon/kakao_logo.svg';
import HomeIcon from '../../icon/home.svg';
import ShoppingIcon from '../../icon/shopping-bag.svg';
import TrelloIcon from '../../icon/trello.svg';

type Page = 'main' | 'profile' | 'favorites' | 'mode' | 'business' | 'businessForm' | 'businessDone' | 'notifications' | 'modeDone' | 'withdrawDone';
type Business = { shop: string; number1: string; number2: string; number3: string; address: string; bank: string; account: string };

const initialBusiness: Business = { shop: '', number1: '', number2: '', number3: '', address: '', bank: '', account: '' };
const sampleBusiness: Business = mockBusiness;
const profileToBusiness = (profile: SellerProfile): Business => { const numbers=profile.businessNumber.split('-'); return {shop:profile.businessName,number1:numbers[0]??'',number2:numbers[1]??'',number3:numbers[2]??'',address:profile.address??'',bank:profile.bankName??'',account:profile.accountNumber??''}; };
const addresses = mockAddresses;
const banks = mockBanks;
const favoriteProducts = mockFavoriteProducts;

export function MyPageScreen({ onHome, onSellerMode, onLogout, onWithdraw }: { onHome: () => void; onSellerMode: () => void; onLogout: () => Promise<void>; onWithdraw: () => Promise<void> }) {
  const [page, setPage] = useState<Page>('main');
  const [dialog, setDialog] = useState<'logout' | 'withdraw' | null>(null);
  const [name, setName] = useState('로컬이');
  const [business, setBusiness] = useState<Business | null>(null);
  const [formReturn, setFormReturn] = useState<'main' | 'mode'>('main');
  useEffect(()=>{authApi.me().then(me=>setName(me.nickname)).catch(()=>undefined);sellerApi.profile().then(profile=>setBusiness(profileToBusiness(profile))).catch(()=>undefined)},[]);

  const openBusiness = (from: 'main' | 'mode') => { setFormReturn(from); setPage(business ? 'business' : 'businessForm'); };
  if (page === 'profile') return <ProfilePage name={name} onBack={() => setPage('main')} onSave={async nextName => { await authApi.updateMe({nickname:nextName});setName(nextName);setPage('main'); }} />;
  if (page === 'favorites') return <FavoritesPage onBack={() => setPage('main')} />;
  if (page === 'mode') return <ModePage certified={!!business} onRegister={() => openBusiness('mode')} onComplete={() => setPage('modeDone')} onBack={() => setPage('main')} />;
  if (page === 'businessForm') return <BusinessForm initial={business ?? initialBusiness} editing={!!business} onBack={() => setPage(formReturn)} onSave={async value => { if(!business)await sellerApi.apply({businessName:value.shop,businessNumber:`${value.number1}-${value.number2}-${value.number3}`,representativeName:name,businessDocumentUrl:''});await sellerApi.createProfile({address:value.address,latitude:null,longitude:null,bankName:value.bank,accountNumber:value.account,accountHolder:name});setBusiness(value);setPage(business ? 'business' : 'businessDone'); }} />;
  if (page === 'businessDone') return <Completion title="사업자 정보 등록 완료!" body="이제 판매자 모드로 전환하여 상품/자원을 등록할 수 있어요." button="홈 화면으로 이동" onPress={() => setPage(formReturn)} />;
  if (page === 'business' && business) return <BusinessInfo value={business} onBack={() => setPage('main')} onEdit={() => setPage('businessForm')} />;
  if (page === 'notifications') return <NotificationPage onBack={() => setPage('main')} />;
  if (page === 'modeDone') return <ModeCompletion onDone={onSellerMode} />;
  if (page === 'withdrawDone') return <Completion title="회원 탈퇴 완료" body={'서비스 이용 기록과 데이터가 모두 삭제되었어요.\n이용해 주셔서 감사합니다.'} button="로그인 화면으로 이동" onPress={onWithdraw} />;

  const rows: Array<[string, () => void, boolean]> = [
    ['찜한 상품/자원 관리', () => setPage('favorites'), true],
    ['앱 모드 전환', () => setPage('mode'), true],
    ['알림 설정', () => setPage('notifications'), true],
    ['로그아웃', () => setDialog('logout'), false],
    ['회원 탈퇴', () => setDialog('withdraw'), false],
  ];
  return <View style={s.root}>
    <AppHeader />
    <Pressable style={s.profileRow} onPress={() => setPage('profile')}><Avatar size={68} /><View style={s.nameRow}><Text style={s.name}>{name}</Text><View style={s.kakao}><KakaoLogo width={12} height={12} /></View></View><ChevronRight width={24} height={24} color={colors.black} /></Pressable>
    {rows.map(([label, onPress, arrow]) => <Pressable key={label} style={s.listRow} onPress={onPress}><Text style={s.rowText}>{label}</Text>{arrow ? <ChevronRight width={24} height={24} color={colors.black} /> : null}</Pressable>)}
    <BottomNavigation active="mypage" onSelect={tab => tab === 'home' && onHome()} />
    <ConfirmDialog type={dialog} onClose={() => setDialog(null)} onConfirm={async () => { if (dialog === 'logout') await onLogout(); else { setDialog(null); setPage('withdrawDone'); } }} />
  </View>;
}

export function SellerMyPageScreen({ onBack, onProducts, onAi, onBuyerMode, onLogout, onWithdraw }: { onBack: () => void; onProducts?: () => void; onAi?:()=>void; onBuyerMode: () => void; onLogout?: () => Promise<void>; onWithdraw?: () => Promise<void> }) {
  const [page, setPage] = useState<'main' | 'business' | 'businessForm' | 'mode' | 'notifications' | 'withdrawDone'>('main');
  const [dialog, setDialog] = useState<'logout' | 'withdraw' | null>(null);
  const [business, setBusiness] = useState<Business>(sampleBusiness);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  useEffect(() => { sellerApi.profile().then(profile => { setSellerProfile(profile); setBusiness(profileToBusiness(profile)); }).catch(error => setProfileError(error instanceof ApiError ? error.message : '사업자 정보를 불러오지 못했습니다.')); }, []);
  if (page === 'business') return <BusinessInfo value={business} onBack={() => setPage('main')} onEdit={() => setPage('businessForm')} />;
  if (page === 'businessForm') return <BusinessForm initial={business} editing onBack={() => setPage('business')} onSave={async value => { try { const profile=await sellerApi.updateProfile({address:value.address,latitude:sellerProfile?.latitude??null,longitude:sellerProfile?.longitude??null,bankName:value.bank,accountNumber:value.account,accountHolder:sellerProfile?.accountHolder??sellerProfile?.representativeName??''}); setSellerProfile(profile); setBusiness(profileToBusiness(profile)); setPage('business'); } catch(error) { setProfileError(error instanceof ApiError?error.message:'사업자 정보 수정에 실패했습니다.'); } }} />;
  if (page === 'mode') return <SellerModePage onBack={() => setPage('main')} onBuyerMode={onBuyerMode} />;
  if (page === 'notifications') return <NotificationPage onBack={() => setPage('main')} />;
  if (page === 'withdrawDone') return <Completion title="회원 탈퇴 완료" body={'서비스 이용 기록과 데이터가 모두 삭제되었어요.\n이용해 주셔서 감사합니다.'} button="로그인 화면으로 이동" onPress={onWithdraw ?? (async () => {})} />;
  const rows: Array<[string, () => void, boolean]> = [
    ['사업자 정보', () => setPage('business'), true],
    ['앱 모드 전환', () => setPage('mode'), true],
    ['알림 설정', () => setPage('notifications'), true],
    ['로그아웃', () => setDialog('logout'), false],
    ['회원 탈퇴', () => setDialog('withdraw'), false],
  ];
  return <View style={s.root}><AppHeader role="seller"/><Pressable style={s.profileRow}><Avatar size={68}/><View style={s.nameRow}><Text style={s.name}>로컬이</Text><View style={s.kakao}><KakaoLogo width={12} height={12}/></View></View><ChevronRight width={24} height={24} color={colors.black}/></Pressable>{profileError?<Text style={s.apiError}>{profileError}</Text>:null}
    {rows.map(([label, onPress, arrow]) => <Pressable key={label} style={s.listRow} onPress={onPress}><Text style={s.rowText}>{label}</Text>{arrow ? <ChevronRight width={24} height={24} color={colors.black}/> : null}</Pressable>)}
    <SellerMyNavigation onHome={onBack} onProducts={onProducts} onAi={onAi}/>
    <ConfirmDialog type={dialog} onClose={() => setDialog(null)} onConfirm={async () => { if (dialog === 'logout') await onLogout?.(); else { setDialog(null); setPage('withdrawDone'); } }} />
  </View>;
}

function SellerMyNavigation({ onHome, onProducts, onAi }: { onHome: () => void; onProducts?: () => void; onAi?:()=>void }) { const tabs = [['홈', HomeIcon], ['상품등록', ShoppingIcon], ['AI추천가', TrelloIcon], ['마이페이지', UserIcon]] as const; return <View style={s.sellerNav}>{tabs.map(([label, Icon], index) => { const active = index === 3; const color = active ? colors.primary500 : colors.g400; const onPress = index === 0 ? onHome : index === 1 ? onProducts : index===2?onAi:undefined; return <Pressable key={label} onPress={onPress} style={s.sellerNavItem}><Icon width={24} height={24} color={color}/><Text style={[s.sellerNavLabel, { color }]}>{label}</Text></Pressable>; })}</View>; }

function SellerModePage({ onBack, onBuyerMode }: { onBack: () => void; onBuyerMode: () => void }) {
  const [buyer, setBuyer] = useState(false);
  return <View style={s.root}><Header title="앱 모드 전환" onBack={onBack}/>
    <View style={s.modeSection}><Text style={s.sectionTitle}>현재 서비스 모드 상태</Text><Text style={s.sectionBody}>현재 <Text style={s.highlight}>판매자 모드</Text>로 매장을 관리하고 있습니다.{`\n`}구매자 모드로 전환하면 주변의 마감 상품과 자원을 둘러보고 예약할 수 있어요.</Text>
      <View style={s.modeTabs}><Pressable onPress={() => setBuyer(true)} style={[s.modeTab, buyer && s.modeTabOn]}><Text>구매자 모드</Text></Pressable><Pressable onPress={() => setBuyer(false)} style={[s.modeTab, !buyer && s.modeTabOn]}><Text>판매자 모드</Text></Pressable></View>
    </View>
    <View style={s.bottomActions}><ActionButton disabled={!buyer} onPress={onBuyerMode}>변경하기</ActionButton></View>
  </View>;
}

function SellerNotificationPage({ onBack }: { onBack: () => void }) {
  const groups = [
    ['서비스 공통 알림', ['공지사항 및 이벤트 알림']],
    ['판매자 모드 알림', ['예약 요청 및 취소 알림', 'AI 실시간 가격 제안 알림', '정산 및 대금 입금 알림']],
    ['구매자 모드 알림', ['마감 임박 알림', '예약 승인 알림']],
  ] as const;
  const [values, setValues] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.flatMap(([, items]) => items.map(item => [item, true]))));
  useEffect(()=>{notificationApi.settings().then(value=>setValues({'공지사항 및 이벤트 알림':value.commonEvent,'예약 요청 및 취소 알림':value.sellerReservation,'AI 실시간 가격 제안 알림':value.sellerAiPrice,'정산 및 대금 입금 알림':value.sellerSettlement,'마감 임박 알림':value.buyerDeadline,'예약 승인 알림':value.buyerReservationApproved})).catch(()=>undefined)},[]);
  const change=(item:string,value:boolean)=>setValues(old=>{const next={...old,[item]:value};void notificationApi.updateSettings({commonEvent:!!next['공지사항 및 이벤트 알림'],sellerReservation:!!next['예약 요청 및 취소 알림'],sellerAiPrice:!!next['AI 실시간 가격 제안 알림'],sellerSettlement:!!next['정산 및 대금 입금 알림'],buyerDeadline:!!next['마감 임박 알림'],buyerReservationApproved:!!next['예약 승인 알림']}).catch(()=>undefined);return next});
  return <View style={s.root}><Header title="알림 설정" onBack={onBack}/><View style={s.notice}><Text style={s.noticeText}>ⓘ  중요한 정보를 놓칠 수 있으므로 알림을 꼭 켜주세요.</Text></View><ScrollView contentContainerStyle={s.notifications}>{groups.map(([title, items]) => <View key={title} style={s.notifyGroup}><Text style={s.notifyGroupTitle}>{title}</Text>{items.map(item => <View key={item} style={s.notifyRow}><Text style={s.notifyText}>{item}</Text><Toggle value={!!values[item]} onChange={value => change(item,value)}/></View>)}</View>)}</ScrollView></View>;
}

function Header({ title, onBack }: { title: string; onBack: () => void }) { return <View style={s.header}><Pressable hitSlop={10} onPress={onBack}><ChevronLeft width={24} height={24} color={colors.black} /></Pressable><Text style={s.headerTitle}>{title}</Text><View style={s.headerSide} /></View>; }
function LocaltimeCharacter({ size }: { size: number }) { return <View style={{ width: size, height: size, zIndex: 1 }}><Character width={size} height={size} /></View>; }
function Avatar({ size }: { size: number }) { return <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}><LocaltimeCharacter size={size} /></View>; }

function ProfilePage({ name, onBack, onSave }: { name: string; onBack: () => void; onSave: (name: string) => void }) {
  const [value, setValue] = useState(name);
  const trimmed = value.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 10;
  const changed = trimmed !== name;
  return <View style={s.root}><Header title="프로필 수정" onBack={onBack} />
    <View style={s.profileAvatar}><Avatar size={120} /><View style={s.editBadge}><Text style={s.editBadgeText}>＋</Text></View></View>
    <View style={s.profileForm}><Text style={s.fieldLabel}>닉네임</Text><TextInput value={value} onChangeText={setValue} maxLength={10} autoFocus={false} placeholder="닉네임 입력" placeholderTextColor={colors.g400} style={[s.input, value.length > 0 && !valid && s.invalidInput]} />
      <View style={s.nicknameHelp}><Text style={[s.nicknameGuide, value.length > 0 && !valid && s.invalidText]}>{value.length > 0 && !valid ? '닉네임은 2~10자로 입력해 주세요.' : '2~10자 이내로 설정해 주세요.'}</Text><Text style={s.nicknameCount}>{value.length}/10</Text></View>
    </View>
    <View style={s.profileSave}><ActionButton disabled={!valid || !changed} onPress={() => onSave(trimmed)}>저장하기</ActionButton></View>
  </View>;
}

function FavoritesPage({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState(favoriteProducts);
  useEffect(()=>{buyerApi.wishlist({size:50}).then(page=>setItems(page.content.map(item=>({id:item.id,title:item.name,discount:`${item.discountRate??0}%`,shop:item.businessName??'',location:item.address??'',original:`${item.price.toLocaleString()}원`,price:`${item.currentPrice.toLocaleString()}원`,remaining:`잔여수량 ${item.qty}개`})))).catch(()=>setItems(mockFavoriteProducts))},[]);
  return <View style={s.root}><Header title="찜한 상품/자원 관리" onBack={onBack} /><ScrollView contentContainerStyle={s.favorites}>
    <Text style={s.favoriteCount}>총 {items.length}개</Text>
    {items.length ? items.map(item => <View key={item.id} style={s.favoriteCard}>
      <View style={s.favoriteHead}><Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 찜 해제`} onPress={() => {setItems(current => current.filter(product => product.id !== item.id));void buyerApi.removeWishlist(item.id).catch(()=>undefined)}}><HeartIcon width={24} height={24} color={colors.primary500} fill={colors.primary500} /></Pressable><Text style={s.discount}>{item.discount}</Text></View>
      <Text style={s.favoriteTitle}>{item.title}</Text>
      <View style={s.favoriteMeta}><Text style={s.favoriteShop}>{item.shop}</Text><Text style={s.favoriteLocation}>{item.location}</Text></View>
      <View style={s.favoritePriceRow}><Text style={s.originalPrice}>{item.original}</Text><Text style={s.salePrice}>{item.price}</Text></View>
      <Text style={s.remaining}>{item.remaining}</Text>
    </View>) : <View style={s.favoriteEmpty}><HeartIcon width={40} height={40} color={colors.g300} fill="none" /><Text style={s.favoriteEmptyTitle}>찜한 상품이 없습니다.</Text><Text style={s.favoriteEmptyBody}>관심 있는 마감 상품과 자원을 찜해 보세요.</Text></View>}
  </ScrollView></View>;
}

function ModePage({ certified, onRegister, onComplete, onBack }: { certified: boolean; onRegister: () => void; onComplete: () => void; onBack: () => void }) {
  const [seller, setSeller] = useState(false);
  return <View style={s.root}><Header title="앱 모드 전환" onBack={onBack} />
    <View style={s.modeSection}><Text style={s.sectionTitle}>현재 서비스 모드 상태</Text><Text style={s.sectionBody}>현재 <Text style={s.highlight}>구매자 모드</Text>로 매장을 관리하고 있습니다.{`\n`}판매자 모드로 전환하여 매장의 마감 상품과 자원을 등록하고, AI 추천 할인가를 확인해 보세요.</Text>
      <View style={s.modeTabs}><Pressable onPress={() => setSeller(false)} style={[s.modeTab, !seller && s.modeTabOn]}><Text>구매자 모드</Text></Pressable><Pressable onPress={() => setSeller(true)} style={[s.modeTab, seller && s.modeTabOn]}><Text>판매자 모드</Text></Pressable></View>
    </View>
    <View style={s.certSection}><Text style={s.sectionTitle}>{certified ? '사업자 정보 여부' : '사업자 정보 확인'}</Text><Text style={s.sectionBody}>판매자 모드로 전환하려면 최초 1회 사업자 정보 등록이 필요합니다. 인증이 완료되면 모드를 전환할 수 있습니다.</Text>
      <View style={s.certBox}><Text style={[s.certIcon, certified && s.success]}>◯</Text><Text style={[s.certText, certified && s.success]}>{certified ? '사업자 정보 확인이 완료됐습니다.' : '사업자 정보가 등록되지 않았습니다.'}</Text></View>
    </View>
    <View style={s.bottomActions}>{!certified && <ActionButton onPress={onRegister}>사업자 정보 등록하기</ActionButton>}<ActionButton disabled={!certified || !seller} onPress={onComplete}>변경하기</ActionButton></View>
  </View>;
}

function BusinessForm({ initial, editing, onBack, onSave }: { initial: Business; editing: boolean; onBack: () => void; onSave: (value: Business) => void }) {
  const [value, setValue] = useState(initial);
  const [sheet, setSheet] = useState<'address' | 'bank' | null>(null);
  const set = (key: keyof Business, text: string) => setValue(v => ({ ...v, [key]: text }));
  const valid = useMemo(() => Object.values(value).every(Boolean) && value.number1.length === 3 && value.number2.length === 2 && value.number3.length === 5, [value]);
  const changed = JSON.stringify(value) !== JSON.stringify(initial);
  return <View style={s.root}><Header title={editing ? '사업자 정보 수정' : '사업자 정보 등록'} onBack={onBack} /><ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
    <Labeled label="상호명"><TextInput value={value.shop} onChangeText={t => set('shop', t)} placeholder="상호명 입력" placeholderTextColor={colors.g400} style={s.input} /></Labeled>
    <Labeled label="사업자등록번호"><View style={s.numberRow}><TextInput value={value.number1} onChangeText={t => set('number1', t.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="3자리" placeholderTextColor={colors.g400} style={[s.input, s.num3]} /><Text style={s.hyphen}>-</Text><TextInput value={value.number2} onChangeText={t => set('number2', t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="2자리" placeholderTextColor={colors.g400} style={[s.input, s.num2]} /><Text style={s.hyphen}>-</Text><TextInput value={value.number3} onChangeText={t => set('number3', t.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" placeholder="5자리" placeholderTextColor={colors.g400} style={[s.input, s.num5]} /></View></Labeled>
    <Labeled label="매장 주소"><View style={s.addressRow}><TextInput value={value.address} onChangeText={t => set('address', t)} placeholder="주소 입력" placeholderTextColor={colors.g400} style={[s.input, s.flex]} /><Pressable style={[s.searchButton, !value.address && s.buttonDisabled]} onPress={() => setSheet('address')}><Text style={s.whiteText}>검색</Text></Pressable></View></Labeled>
    <Labeled label="은행명"><Pressable style={s.select} onPress={() => setSheet('bank')}><Text style={{ color: value.bank ? colors.black : colors.g400 }}>{value.bank || '은행 검색'}</Text><ChevronDown width={24} height={24} color={colors.g300} /></Pressable></Labeled>
    <Labeled label="정산 계좌번호"><TextInput value={value.account} onChangeText={t => set('account', t.replace(/[^0-9-]/g, ''))} keyboardType="number-pad" placeholder="'-' 제외 계좌번호 입력" placeholderTextColor={colors.g400} style={s.input} /></Labeled>
  </ScrollView><View style={s.formButton}><ActionButton disabled={!valid || (editing && !changed)} onPress={() => onSave(value)}>{editing ? '저장하기' : '등록하기'}</ActionButton></View>
    <SelectionSheet type={sheet} query={value.address} onClose={() => setSheet(null)} onAddress={address => { set('address', address); setSheet(null); }} onBank={bank => { set('bank', bank); setSheet(null); }} />
  </View>;
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) { return <View style={s.field}><Text style={s.fieldLabel}>{label} <Text style={s.required}>*</Text></Text>{children}</View>; }

function SelectionSheet({ type, query, onClose, onAddress, onBank }: { type: 'address' | 'bank' | null; query: string; onClose: () => void; onAddress: (v: string) => void; onBank: (v: string) => void }) {
  return <Modal transparent visible={!!type} animationType="slide" onRequestClose={onClose}><Pressable style={s.sheetOverlay} onPress={onClose}><Pressable style={s.sheet} onPress={() => undefined}><View style={s.handle} />
    {type === 'address' ? <><Text style={s.sheetTitle}>‘{query || '제주시 한림읍'}’ 검색 결과</Text>{addresses.map(([zip, road, lot]) => <Pressable key={road} style={s.addressItem} onPress={() => onAddress(road.replace('제주특별자치도 ', ''))}><Text style={s.zip}>{zip}</Text><Text style={s.road}>{road}</Text><Text style={s.lot}>[지번] {lot}</Text></Pressable>)}</> : <><Text style={s.sheetTitle}>은행을 선택해 주세요</Text><View style={s.bankGrid}>{banks.map((bank, i) => <Pressable key={bank} style={s.bankItem} onPress={() => onBank(bank)}><View style={[s.bankLogo, { backgroundColor: ['#ffb629', '#ffd83d', '#fee500', '#1678eb', '#25a7df', '#00a67d'][i % 6] }]}><Text style={s.bankLetter}>{bank.slice(0, 1)}</Text></View><Text style={s.bankName}>{bank}</Text></Pressable>)}</View></>}
  </Pressable></Pressable></Modal>;
}

function BusinessInfo({ value, onBack, onEdit }: { value: Business; onBack: () => void; onEdit: () => void }) { const rows = [['상호명', value.shop], ['사업자등록번호', `${value.number1}-${value.number2}-${value.number3}`], ['매장 주소', value.address], ['은행명', value.bank], ['정산 계좌번호', value.account]]; return <View style={s.root}><Header title="사업자 정보" onBack={onBack} /><View style={s.infoRows}>{rows.map(([label, text]) => <View key={label} style={s.infoRow}><Text style={s.infoLabel}>{label}</Text><Text style={s.infoValue}>{text}</Text></View>)}</View><View style={s.businessEdit}><Text style={s.helper}>ⓘ 마감 상품/자원을 등록하려면 최초 1회 사업자 정보 등록이 필요합니다.</Text><ActionButton dark onPress={onEdit}>수정하기</ActionButton></View></View>; }

function Completion({ title, body, button, onPress }: { title: string; body: string; button: string; onPress: () => void | Promise<void> }) { return <View style={s.root}><View style={s.completeArt}><LocaltimeCharacter size={112} /></View><View style={s.completeCopy}><Text style={s.completeTitle}>{title}</Text><Text style={s.completeBody}>{body}</Text></View><View style={s.completeButton}><ActionButton onPress={onPress}>{button}</ActionButton></View></View>; }
function ModeCompletion({ onDone }: { onDone: () => void }) { return <View style={s.root}><Text style={s.modeDoneLabel}>판매자 모드 전환 완료!</Text><View style={s.modeDoneArt}><LocaltimeCharacter size={124} /></View><View style={s.modeDoneCopy}><Text style={s.completeTitle}>로컬타임님, 환영합니다!</Text><Text style={s.completeBody}>매장의 마감 상품 및 자원을 등록하고,{`\n`}AI 가격 제안으로 매출을 극대화해 보세요.</Text></View><View style={s.modeDoneButton}><ActionButton onPress={onDone}>시작하기</ActionButton></View></View>; }

function NotificationPage({ onBack }: { onBack: () => void }) { return <SellerNotificationPage onBack={onBack}/>; }

function ConfirmDialog({ type, onClose, onConfirm }: { type: 'logout' | 'withdraw' | null; onClose: () => void; onConfirm: () => void | Promise<void> }) { return <Modal transparent visible={!!type} animationType="fade" onRequestClose={onClose}><View style={s.dialogOverlay}><View style={s.dialog}><Text style={s.dialogTitle}>{type === 'logout' ? '로그아웃 하시겠습니까?' : '회원 탈퇴 하시겠습니까?'}</Text><Text style={s.dialogBody}>{type === 'logout' ? '로그아웃 후에는 실시간 예약 요청 및 푸시 알림이 발송되지 않습니다.' : '등록된 매장 정보, 상품 등록 및 구매 이력, AI 매출 리포트 데이터가 즉시 삭제되며 복구되지 않습니다.'}</Text>{type === 'withdraw' && <Text style={s.dialogNotice}>ⓘ 현재 진행 중인 예약 요청 및 정산이 있다면 처리 완료 후 탈퇴가 가능합니다.</Text>}<View style={s.dialogButtons}><Pressable onPress={onConfirm} style={[s.dialogButton, s.orange]}><Text style={s.whiteText}>{type === 'logout' ? '로그아웃' : '탈퇴하기'}</Text></Pressable><Pressable onPress={onClose} style={[s.dialogButton, s.gray]}><Text style={s.whiteText}>취소</Text></Pressable></View></View></View></Modal>; }

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white }, header: { height: 56, borderBottomWidth: 1, borderBottomColor: colors.g200, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerTitle: { fontSize: 16, fontWeight: '600', color: colors.black }, headerSide: { width: 24 },
  apiError: { marginHorizontal:16,marginTop:8,fontSize:12,color:colors.danger },
  profileRow: { height: 92, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.g200, flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { overflow: 'hidden', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }, name: { fontSize: 16, fontWeight: '600' }, kakao: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.kakao, alignItems: 'center', justifyContent: 'center' }, listRow: { height: 70, borderBottomWidth: 1, borderBottomColor: colors.g200, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, rowText: { fontSize: 16, fontWeight: '600' },
  profileAvatar: { position: 'absolute', top: 100, alignSelf: 'center' }, editBadge: { position: 'absolute', right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary500, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' }, editBadgeText: { color: colors.white, fontSize: 19, lineHeight: 22, fontWeight: '600' }, profileForm: { position: 'absolute', top: 297, left: 16, right: 16, gap: 8 }, nicknameHelp: { flexDirection: 'row', justifyContent: 'space-between' }, nicknameGuide: { fontSize: 12, color: colors.g500 }, nicknameCount: { fontSize: 12, color: colors.g400 }, invalidInput: { borderColor: colors.danger }, invalidText: { color: colors.danger }, profileSave: { position: 'absolute', left: 16, right: 16, bottom: 34 },
  favorites: { padding: 16, paddingBottom: 32, gap: 12 }, favoriteCount: { alignSelf: 'flex-end', fontSize: 12, color: colors.g500 }, favoriteCard: { padding: 16, borderWidth: 1, borderColor: colors.g200, borderRadius: radius.lg, gap: 9, backgroundColor: colors.white }, favoriteHead: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.g200, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, discount: { fontSize: 16, fontWeight: '600', color: colors.info }, favoriteTitle: { fontSize: 18, fontWeight: '600', color: colors.black }, favoriteMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 }, favoriteShop: { fontSize: 14, fontWeight: '600', color: colors.g800 }, favoriteLocation: { fontSize: 12, color: colors.g600 }, favoritePriceRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, originalPrice: { fontSize: 14, color: colors.g600, textDecorationLine: 'line-through' }, salePrice: { fontSize: 20, fontWeight: '600', color: colors.danger }, remaining: { fontSize: 12, color: colors.g600, textAlign: 'right' }, favoriteEmpty: { paddingTop: 150, alignItems: 'center', gap: 10 }, favoriteEmptyTitle: { marginTop: 6, fontSize: 16, fontWeight: '600' }, favoriteEmptyBody: { fontSize: 13, color: colors.g500 },
  modeSection: { marginHorizontal: 16, paddingTop: 16, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.g200, gap: 8 }, certSection: { marginHorizontal: 16, paddingTop: 18, gap: 8 }, sectionTitle: { fontSize: 18, fontWeight: '600' }, sectionBody: { fontSize: 12, lineHeight: 17, color: colors.g800 }, highlight: { color: colors.primary500, fontWeight: '700' }, modeTabs: { height: 52, marginTop: 16, padding: 4, borderRadius: radius.md, backgroundColor: colors.g200, flexDirection: 'row' }, modeTab: { flex: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }, modeTabOn: { backgroundColor: colors.white, elevation: 2, shadowColor: '#000', shadowOpacity: .15, shadowRadius: 2 }, certBox: { marginTop: 16, height: 52, borderWidth: 1, borderColor: colors.g200, borderRadius: radius.md, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }, certIcon: { fontSize: 22, color: colors.info }, certText: { fontSize: 14, fontWeight: '600', color: colors.info }, success: { color: colors.success }, bottomActions: { position: 'absolute', left: 16, right: 16, bottom: 34, gap: 11 },
  form: { padding: 16, gap: 32, paddingBottom: 110 }, field: { gap: 8 }, fieldLabel: { fontSize: 14, fontWeight: '500' }, required: { color: colors.primary500 }, input: { height: 52, borderWidth: 1, borderColor: colors.g300, borderRadius: radius.sm, paddingHorizontal: 15, fontSize: 16, color: colors.black }, numberRow: { flexDirection: 'row', alignItems: 'center' }, num3: { width: 87 }, num2: { width: 70 }, num5: { flex: 1 }, hyphen: { width: 28, textAlign: 'center', color: colors.g400 }, addressRow: { flexDirection: 'row', gap: 10 }, flex: { flex: 1 }, searchButton: { width: 100, height: 52, borderRadius: radius.md, backgroundColor: colors.primary500, alignItems: 'center', justifyContent: 'center' }, buttonDisabled: { backgroundColor: colors.g200 }, whiteText: { color: colors.white, fontSize: 16, fontWeight: '600' }, select: { height: 52, borderWidth: 1, borderColor: colors.g300, borderRadius: radius.sm, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, formButton: { position: 'absolute', left: 16, right: 16, bottom: 34 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.25)', justifyContent: 'flex-end' }, sheet: { maxHeight: '55%', minHeight: 400, backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 12 }, handle: { width: 60, height: 4, borderRadius: 2, backgroundColor: colors.g200, alignSelf: 'center', marginBottom: 14 }, sheetTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 }, addressItem: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.g200, gap: 4 }, zip: { color: colors.info, fontWeight: '600' }, road: { fontSize: 14, fontWeight: '500' }, lot: { fontSize: 12, color: colors.g400 }, bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, bankItem: { width: '30.8%', height: 90, borderWidth: 1, borderColor: colors.g200, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 7 }, bankLogo: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, bankLetter: { color: colors.white, fontWeight: '800' }, bankName: { fontSize: 13 },
  infoRows: { margin: 16 }, infoRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center' }, infoLabel: { width: 128, fontSize: 14, color: colors.g600 }, infoValue: { flex: 1, fontSize: 14, fontWeight: '500' }, businessEdit: { position: 'absolute', left: 16, right: 16, bottom: 34, gap: 10 }, helper: { fontSize: 10, color: colors.g400 },
  completeArt: { position: 'absolute', top: 199, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }, glow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#eef8ff' }, completeCopy: { position: 'absolute', top: 350, left: 16, right: 16, alignItems: 'center', gap: 6 }, completeTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' }, completeBody: { fontSize: 14, lineHeight: 18, color: colors.g500, textAlign: 'center' }, completeButton: { position: 'absolute', top: 501, left: 16, right: 16 }, modeDoneLabel: { position: 'absolute', top: 76, alignSelf: 'center', fontSize: 16, fontWeight: '600' }, modeDoneArt: { position: 'absolute', top: 177, alignSelf: 'center' }, modeDoneCopy: { position: 'absolute', top: 335, left: 16, right: 16, alignItems: 'center', gap: 8 }, modeDoneButton: { position: 'absolute', top: 505, left: 16, right: 16 },
  notice: { margin: 16, padding: 14, borderRadius: radius.md, backgroundColor: '#eaf2ff' }, noticeText: { color: colors.info, fontSize: 12, fontWeight: '600' }, notifications: { paddingHorizontal: 16, paddingBottom: 24 }, notifyGroup: { marginBottom: 18 }, notifyGroupTitle: { fontSize: 16, fontWeight: '600', color: colors.black, marginBottom: 4 }, notifyRow: { height: 62, borderBottomWidth: 1, borderBottomColor: colors.g200, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, notifyText: { flex: 1, paddingRight: 12, fontSize: 14, color: colors.g800 },
  dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.25)', alignItems: 'center', justifyContent: 'center', padding: 16 }, dialog: { width: '100%', maxWidth: 370, backgroundColor: colors.white, borderRadius: radius.lg, padding: 20, gap: 12 }, dialogTitle: { fontSize: 18, fontWeight: '600' }, dialogBody: { fontSize: 12, lineHeight: 17, color: colors.g600 }, dialogNotice: { marginTop: 8, fontSize: 10, color: colors.info }, dialogButtons: { flexDirection: 'row', gap: 8, marginTop: 8 }, dialogButton: { flex: 1, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, orange: { backgroundColor: colors.primary500 }, gray: { backgroundColor: colors.g300 },
  sellerNav:{position:'absolute',left:0,right:0,bottom:0,height:66,borderTopWidth:1,borderTopColor:colors.g200,backgroundColor:colors.white,paddingHorizontal:12,flexDirection:'row'},sellerNavItem:{flex:1,paddingVertical:8,alignItems:'center',gap:8},sellerNavLabel:{fontSize:12,fontWeight:'600'},
});

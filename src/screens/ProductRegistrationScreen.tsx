import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius } from '../theme';
import { ApiError, sellerApi } from '../api';
import ChevronDown from '../../icon/chevron_down.svg';
import ChevronLeft from '../../icon/chevron_left.svg';
import CloseIcon from '../../icon/x.svg';
import Character from '../../icon/로컬타임_캐릭터 1.svg';
import { TimeWheel } from './RegisteredProductsScreen';

type Category = '음식점' | '숙박' | '체험' | '렌탈/모빌리티';
type Sheet = 'category' | 'type' | 'start' | 'end' | 'location' | null;

const categoryTypes: Record<Category, string[]> = {
  음식점: ['당일 재고', '빈 시간대 자원'],
  숙박: ['당일 공실'],
  체험: ['빈 시간대 자원'],
  '렌탈/모빌리티': ['이동/관광 잔여 상품'],
};
const times = ['오전 9:00', '오전 10:00', '오전 11:00', '오후 12:00', '오후 1:00', '오후 2:00', '오후 3:00', '오후 4:00', '오후 5:00', '오후 6:00', '오후 7:00', '오후 8:00', '오후 9:00', '오후 10:00', '오후 11:00'];
const productTypeConfig = {
  음식점: { businessType: 'RESTAURANT', types: { '당일 재고': 'SAME_DAY_INVENTORY', '빈 시간대 자원': 'EMPTY_TIME_RESOURCE' } },
  숙박: { businessType: 'LODGING', types: { '당일 공실': 'SAME_DAY_ROOM' } },
  체험: { businessType: 'EXPERIENCE', types: { '빈 시간대 자원': 'EMPTY_TIME_RESOURCE' } },
  '렌탈/모빌리티': { businessType: 'RENTAL_MOBILITY', types: { '이동/관광 잔여 상품': 'TOUR_REMAINDER' } },
} as const;

function timeToIso(value: string) {
  const match = value.match(/(오전|오후)\s*(\d+):(\d+)/);
  let hour = Number(match?.[2] ?? 0) % 12;
  if (match?.[1] === '오후') hour += 12;
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const minute = Number(match?.[3] ?? 0);
  return new Date(`${date}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00+09:00`).toISOString();
}
function timeMinutes(value:string){const match=value.match(/(오전|오후)\s*(\d+):(\d+)/);if(!match)return-1;let hour=Number(match[2])%12;if(match[1]==='오후')hour+=12;return hour*60+Number(match[3]);}

export function ProductRegistrationScreen({ onBack, onCreated }: { onBack: () => void; onCreated?: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [type, setType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [regular, setRegular] = useState('');
  const [minimum, setMinimum] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [submitted, setSubmitted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  useEffect(()=>{sellerApi.profile().then(profile=>{if(profile.address){setLocations([profile.address]);setLocation(profile.address)}}).catch(()=>setRequestError('사업자 정보의 매장 주소를 불러오지 못했습니다.'))},[]);

  const requiredFieldsValid = !!(images.length && name.trim() && description.trim() && category && type && quantity && regular && minimum && start && end && location);
  const invalidPriceRange = !!(regular && minimum && Number(minimum) > Number(regular));
  const invalidTimeRange = !!(start && end && timeMinutes(start) >= timeMinutes(end));
  const valid = requiredFieldsValid && !invalidPriceRange && !invalidTimeRange;
  const types = useMemo(() => category ? categoryTypes[category] : [], [category]);
  const digits = (value: string, setter: (value: string) => void) => setter(value.replace(/\D/g, ''));
  const error = (value: string) => submitted && !value;
  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setRequestError('사진 등록을 위해 사진 보관함 접근 권한을 허용해 주세요.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:3-images.length,quality:.85});
    if (!result.canceled) setImages(current => [...current, ...result.assets].slice(0,3));
  };
  const submit = async () => {
    setSubmitted(true);
    setRequestError(null);
    setPriceError(invalidPriceRange ? '최소 판매가는 정가/원가보다 높을 수 없습니다.' : null);
    setTimeError(invalidTimeRange ? '판매 시작 시각은 판매 마감 시각보다 빨라야 합니다.' : null);
    if (!valid || !category) return;
    const config = productTypeConfig[category];
    const productCategory = config.types[type as keyof typeof config.types];
    if (!productCategory) return;
    setSaving(true);
    try {
      const product = await sellerApi.createProduct({
        name: name.trim(),
        description: description.trim(),
        businessType: config.businessType,
        category: productCategory,
        qty: Number(quantity),
        price: Number(regular),
        minPrice: Number(minimum),
        openTime: timeToIso(start),
        deadline: timeToIso(end),
        address: location,
      });
      try {
        await sellerApi.uploadProductImages(product.id, images.map((image,index)=>({uri:image.uri,name:image.fileName??`product-${index+1}.jpg`,type:image.mimeType??'image/jpeg',file:image.file})));
      } catch (uploadError) {
        await sellerApi.deleteProduct(product.id).catch(()=>undefined);
        throw uploadError;
      }
      setComplete(true);
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : '상품 등록 요청에 실패했습니다. 잠시 후 다시 시도해주세요.';
      if (/최소|최고|금액|가격/.test(message)) setPriceError(message);
      else if (/시작.*(종료|마감)|종료.*시작|시간/.test(message)) setTimeError(message);
      else setRequestError(message);
    } finally { setSaving(false); }
  };

  if (complete) return <Completion onDone={() => { onCreated?.(); onBack(); }} />;

  return <View style={s.root}>
    <Header onBack={onBack} />
    <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={s.title}>신규 상품/자원 등록하기</Text>
      <View style={s.photoField}>
        <View style={s.photoHead}><Text style={s.label}>사진 등록<Text style={s.required}> *</Text></Text><Text style={s.photoHint}>첫 번째로 등록된 이미지가 대표 썸네일로 자동 지정되며, 최대 3장까지 등록 가능합니다.</Text></View>
        {images.length===0 ? <Pressable accessibilityLabel="상품 사진 추가" onPress={pickImages} style={s.addCircle}><Text style={s.plus}>＋</Text></Pressable> : <View style={s.photos}>
          {images.map((image,index)=><View key={`${image.uri}-${index}`} style={[s.photo,index===0&&s.coverPhoto]}><Image source={{uri:image.uri}} style={s.photoImage}/><Pressable accessibilityLabel={`${index+1}번째 사진 삭제`} hitSlop={6} onPress={()=>setImages(current=>current.filter((_,i)=>i!==index))} style={s.removePhoto}><Text style={s.removeText}>×</Text></Pressable></View>)}
          {images.length<3?<Pressable accessibilityLabel="상품 사진 추가" onPress={pickImages} style={[s.photo,s.photoAdd]}><Text style={s.plus}>＋</Text></Pressable>:null}
        </View>}
        {submitted&&!images.length?<Text style={s.errorText}>상품 사진을 1장 이상 등록해 주세요.</Text>:null}
      </View>
      <FormField label="상품/자원 이름" error={error(name)} message="상품/자원 이름을 입력해주세요.">
        <TextInput value={name} onChangeText={setName} placeholder="예시: 카페 창가 빈 좌석 2인" placeholderTextColor={colors.g400} style={[s.input, error(name) && s.inputError]} />
      </FormField>
      <FormField label="상품/자원 카테고리 및 유형" error={submitted && (!category || !type)} message="카테고리와 유형을 모두 선택해주세요.">
        <Select value={category ?? ''} placeholder="카테고리 선택" onPress={() => setSheet('category')} error={submitted && !category} />
        <Select value={type} placeholder="유형 선택" onPress={() => category && setSheet('type')} disabled={!category} error={submitted && !type} />
      </FormField>
      <FormField label="등록 수량" error={error(quantity)} message="등록 수량을 입력해주세요.">
        <TextInput value={quantity} onChangeText={v => digits(v, setQuantity)} keyboardType="number-pad" placeholder="수량 입력" placeholderTextColor={colors.g400} style={[s.input, error(quantity) && s.inputError]} />
      </FormField>
      <View style={s.timeRow}><View style={s.timeCell}><FormField label="정가/원가" error={error(regular)} message="정가/원가를 입력해주세요."><MoneyInput value={regular} onChange={v => { digits(v, setRegular); setPriceError(null); }} error={error(regular) || invalidPriceRange} /></FormField></View><View style={s.timeCell}><FormField label="최소 판매가" error={error(minimum)} message="최소 판매가를 입력해주세요."><MoneyInput value={minimum} onChange={v => { digits(v, setMinimum); setPriceError(null); }} error={error(minimum) || invalidPriceRange} /></FormField></View></View>
      {priceError ? <Text style={s.timeRangeError}>{priceError}</Text> : null}
      <FormField label="상품 설명" error={error(description)} message="상품 설명을 입력해주세요.">
        <View style={[s.descriptionBox,error(description)&&s.inputError]}><TextInput multiline maxLength={50} value={description} onChangeText={setDescription} placeholder="상품의 특징이나 이용 방법을 입력해주세요." placeholderTextColor={colors.g400} style={s.descriptionInput}/><Text style={s.characterCount}>{description.length}/50</Text></View>
      </FormField>
      <View style={s.timeRow}>
        <View style={s.timeCell}><FormField label="판매 시작 시각" error={error(start)}><Select value={start} placeholder="시각 선택" onPress={() => setSheet('start')} error={error(start)} /></FormField></View>
        <View style={s.timeCell}><FormField label="판매 마감 시각" error={error(end)}><Select value={end} placeholder="시각 선택" onPress={() => setSheet('end')} error={error(end)} /></FormField></View>
      </View>
      {timeError ? <Text style={s.timeRangeError}>{timeError}</Text> : null}
      <FormField label="매장 위치" error={error(location)} message="상품/자원을 등록할 매장을 선택해주세요.">
        <Select value={location} placeholder="매장 선택" onPress={() => setSheet('location')} error={error(location)} />
      </FormField>
      <Pressable disabled={saving} style={[s.submit, (!valid || saving) && s.submitDisabled]} onPress={submit}>
        <Text style={[s.submitText, (!valid || saving) && s.submitTextDisabled]}>{saving ? '등록 중...' : '상품/자원 등록하기'}</Text>
      </Pressable>
      {requestError ? <Text style={s.requestError}>{requestError}</Text> : null}
    </ScrollView>
    <ChoiceSheet
      kind={sheet === 'start' || sheet === 'end' ? null : sheet}
      options={sheet === 'category' ? Object.keys(categoryTypes) : sheet === 'type' ? types : sheet === 'location' ? locations : times}
      selected={sheet === 'category' ? category ?? '' : sheet === 'type' ? type : sheet === 'location' ? location : sheet === 'start' ? start : end}
      onClose={() => setSheet(null)}
      onSelect={value => {
        if (sheet === 'category') { setCategory(value as Category); setType(''); }
        if (sheet === 'type') setType(value);
        if (sheet === 'start') { setStart(value); setTimeError(null); }
        if (sheet === 'end') { setEnd(value); setTimeError(null); }
        if (sheet === 'location') setLocation(value);
        setSheet(null);
      }}
    />
    <TimeWheel visible={sheet === 'start' || sheet === 'end'} value={sheet === 'start' ? start : end} title={sheet === 'start' ? '판매 시작 시각' : '판매 마감 시각'} onClose={() => setSheet(null)} onApply={value => { if (sheet === 'start') { setStart(value); setTimeError(null); } if (sheet === 'end') { setEnd(value); setTimeError(null); } setSheet(null); }}/>
  </View>;
}

function Header({ onBack }: { onBack: () => void }) {
  return <View style={s.header}><Pressable hitSlop={10} onPress={onBack}><ChevronLeft width={24} height={24} color={colors.black} /></Pressable><Text style={s.headerTitle}>상품등록</Text><View style={{ width: 24 }} /></View>;
}
function FormField({ label, error, message, children }: { label: string; error?: boolean; message?: string; children: React.ReactNode }) {
  return <View style={s.field}><Text style={s.label}>{label}<Text style={s.required}> *</Text></Text>{children}{error && message ? <Text style={s.errorText}>{message}</Text> : null}</View>;
}
function Select({ value, placeholder, onPress, disabled, error }: { value: string; placeholder: string; onPress: () => void; disabled?: boolean; error?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[s.select, disabled && s.selectDisabled, error && s.inputError]}><Text style={[s.selectText, !value && s.placeholder]} numberOfLines={1}>{value || placeholder}</Text><ChevronDown width={22} height={22} color={disabled ? colors.g200 : colors.g400} /></Pressable>;
}
function MoneyInput({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: boolean }) {
  return <View style={s.money}><TextInput value={value ? Number(value).toLocaleString() : ''} onChangeText={onChange} keyboardType="number-pad" placeholder="금액 입력" placeholderTextColor={colors.g400} style={[s.input, s.moneyInput, error && s.inputError]} /><Text style={s.won}>원</Text></View>;
}
function ChoiceSheet({ kind, options, selected, onClose, onSelect }: { kind: Sheet; options: string[]; selected: string; onClose: () => void; onSelect: (value: string) => void }) {
  const titles: Record<Exclude<Sheet, null>, string> = { category: '카테고리 선택', type: '유형 선택', start: '판매 시작 시각 선택', end: '판매 마감 시각 선택', location: '상품/자원을 등록할 매장 선택' };
  if (!kind) return null;
  return <Modal transparent visible animationType="slide" onRequestClose={onClose}><Pressable style={s.overlay} onPress={onClose}><Pressable style={s.sheet} onPress={() => {}}>
    <View style={s.sheetHead}><View><Text style={s.sheetTitle}>{titles[kind]}</Text>{kind === 'location' ? <Text style={s.sheetHint}>사업자 정보에 등록했던 매장이에요.</Text> : null}</View><Pressable hitSlop={8} onPress={onClose}><CloseIcon width={24} height={24} color={colors.g500} /></Pressable></View>
    <ScrollView style={s.options}>{options.map(option => <Pressable key={option} style={s.option} onPress={() => onSelect(option)}><Text style={[s.optionText, selected === option && s.optionSelected]}>{option}</Text><View style={[s.radio, selected === option && s.radioOn]}>{selected === option ? <View style={s.radioDot} /> : null}</View></Pressable>)}</ScrollView>
  </Pressable></Pressable></Modal>;
}
function Completion({ onDone }: { onDone: () => void }) {
  return <View style={s.complete}><View style={s.completeBody}><Character width={184} height={184} /><Text style={s.completeTitle}>상품 등록 완료!</Text><Text style={s.completeText}>AI 추천가를 확인하고, 매장 운영의 효율성을 극대화해보세요.</Text></View><Pressable style={[s.submit,s.completeAction]} onPress={onDone}><Text style={s.submitText}>판매자 홈으로 가기</Text></Pressable></View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.white}, header:{height:56,borderBottomWidth:1,borderBottomColor:colors.g200,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, headerTitle:{fontSize:16,fontWeight:'600',color:colors.black},
  form:{padding:16,paddingBottom:100,gap:24}, title:{fontSize:20,fontWeight:'600',color:colors.black}, field:{gap:8}, label:{fontSize:14,fontWeight:'500',color:colors.black}, required:{color:colors.primary500}, input:{height:52,borderWidth:1,borderColor:colors.g300,borderRadius:radius.sm,paddingHorizontal:14,fontSize:16,color:colors.black,backgroundColor:colors.white}, inputError:{borderColor:colors.danger}, errorText:{fontSize:12,color:colors.danger},
  photoField:{gap:16,alignItems:'center'},photoHead:{width:'100%',gap:4},photoHint:{fontSize:10,color:colors.g500},addCircle:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(230,230,229,.5)',alignItems:'center',justifyContent:'center'},plus:{fontSize:28,fontWeight:'300',color:colors.g500},photos:{width:'100%',flexDirection:'row',gap:12},photo:{width:94,height:94,borderRadius:12,overflow:'hidden',backgroundColor:colors.g100,borderWidth:1,borderColor:'transparent'},coverPhoto:{borderColor:colors.primary500,borderWidth:2},photoImage:{width:'100%',height:'100%'},photoAdd:{alignItems:'center',justifyContent:'center',borderStyle:'dashed',borderColor:colors.g300},removePhoto:{position:'absolute',right:5,top:5,width:20,height:20,borderRadius:10,backgroundColor:'rgba(126,124,119,.72)',alignItems:'center',justifyContent:'center'},removeText:{color:colors.white,fontSize:18,lineHeight:20,fontWeight:'600'},
  descriptionBox:{minHeight:112,borderWidth:1,borderColor:colors.g300,borderRadius:radius.sm,paddingHorizontal:14,paddingTop:12,paddingBottom:8,backgroundColor:colors.white},descriptionInput:{minHeight:70,fontSize:14,lineHeight:20,color:colors.black,textAlignVertical:'top'},characterCount:{fontSize:10,color:colors.g500,textAlign:'right'},select:{height:52,borderWidth:1,borderColor:colors.g300,borderRadius:radius.sm,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:colors.white}, selectDisabled:{backgroundColor:colors.g100,borderColor:colors.g200}, selectText:{flex:1,fontSize:16,color:colors.black}, placeholder:{color:colors.g400}, money:{flexDirection:'row',alignItems:'center',gap:10}, moneyInput:{flex:1}, won:{fontSize:16,color:colors.black,paddingHorizontal:8}, timeRow:{flexDirection:'row',gap:12}, timeCell:{flex:1}, timeRangeError:{fontSize:12,color:colors.danger,marginTop:-16},
  submit:{height:56,borderRadius:radius.md,backgroundColor:colors.primary500,alignItems:'center',justifyContent:'center',marginTop:8}, submitDisabled:{backgroundColor:colors.g200}, submitText:{fontSize:16,fontWeight:'600',color:colors.white}, submitTextDisabled:{color:colors.g400}, requestError:{fontSize:12,lineHeight:18,color:colors.danger,textAlign:'center'},
  overlay:{flex:1,backgroundColor:'rgba(17,17,17,.28)',justifyContent:'flex-end',alignItems:'center'}, sheet:{width:'100%',maxWidth:402,maxHeight:'72%',backgroundColor:colors.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,paddingBottom:28}, sheetHead:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}, sheetTitle:{fontSize:18,fontWeight:'600',color:colors.black}, sheetHint:{fontSize:12,color:colors.g500,marginTop:5}, options:{maxHeight:450}, option:{minHeight:54,borderBottomWidth:1,borderBottomColor:colors.g200,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, optionText:{fontSize:16,color:colors.g800}, optionSelected:{fontWeight:'600',color:colors.primary700}, radio:{width:24,height:24,borderRadius:12,borderWidth:2,borderColor:colors.g300,alignItems:'center',justifyContent:'center'}, radioOn:{borderColor:colors.primary500}, radioDot:{width:12,height:12,borderRadius:6,backgroundColor:colors.primary500},
  complete:{flex:1,backgroundColor:colors.white,padding:16,justifyContent:'space-between'}, completeAction:{marginBottom:70}, completeBody:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:12}, completeTitle:{fontSize:28,fontWeight:'700',color:colors.black,marginTop:16}, completeText:{fontSize:16,lineHeight:24,color:colors.g500,textAlign:'center',marginTop:10},
});

import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';
import { ApiError, sellerApi } from '../api';
import ChevronDown from '../../icon/chevron_down.svg';
import ChevronLeft from '../../icon/chevron_left.svg';
import CloseIcon from '../../icon/x.svg';
import Character from '../../icon/로컬타임_캐릭터 1.svg';
import { mockLocations } from '../mocks/data';

type Category = '음식점' | '숙박' | '체험' | '렌탈/모빌리티';
type Sheet = 'category' | 'type' | 'start' | 'end' | 'location' | null;

const categoryTypes: Record<Category, string[]> = {
  음식점: ['당일 재고', '빈 시간대 자원'],
  숙박: ['당일 공실'],
  체험: ['빈 시간대 자원'],
  '렌탈/모빌리티': ['이동/관광 잔여 상품'],
};
const times = ['오전 9:00', '오전 10:00', '오전 11:00', '오후 12:00', '오후 1:00', '오후 2:00', '오후 3:00', '오후 4:00', '오후 5:00', '오후 6:00', '오후 7:00', '오후 8:00', '오후 9:00', '오후 10:00', '오후 11:00'];
const locations = mockLocations;
const businessTypes = ['RESTAURANT', 'LODGING', 'EXPERIENCE', 'RENTAL_MOBILITY'] as const;
const productCategories = [
  ['SAME_DAY_INVENTORY', 'EMPTY_TIME_RESOURCE'],
  ['SAME_DAY_ROOM'],
  ['EMPTY_TIME_RESOURCE'],
  ['TOUR_REMAINDER'],
] as const;

function timeToIso(value: string) {
  const index = times.indexOf(value);
  const date = new Date();
  date.setHours(index < 0 ? 0 : 9 + index, 0, 0, 0);
  return date.toISOString();
}

export function ProductRegistrationScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [type, setType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [regular, setRegular] = useState('');
  const [minimum, setMinimum] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [submitted, setSubmitted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const valid = !!(name.trim() && category && type && quantity && regular && minimum && start && end && location);
  const types = useMemo(() => category ? categoryTypes[category] : [], [category]);
  const digits = (value: string, setter: (value: string) => void) => setter(value.replace(/\D/g, ''));
  const error = (value: string) => submitted && !value;
  const submit = async () => {
    setSubmitted(true);
    setRequestError(null);
    if (!valid || !category) return;
    const categoryIndex = Object.keys(categoryTypes).indexOf(category);
    const typeIndex = categoryTypes[category].indexOf(type);
    if (categoryIndex < 0 || typeIndex < 0) return;
    setSaving(true);
    try {
      await sellerApi.createProduct({
        name: name.trim(),
        businessType: businessTypes[categoryIndex],
        category: productCategories[categoryIndex][typeIndex],
        qty: Number(quantity),
        price: Number(regular),
        minPrice: Number(minimum),
        openTime: timeToIso(start),
        deadline: timeToIso(end),
        address: location,
      });
      setComplete(true);
    } catch (cause) {
      setRequestError(cause instanceof ApiError ? cause.message : '상품 등록 요청에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally { setSaving(false); }
  };

  if (complete) return <Completion onDone={onBack} />;

  return <View style={s.root}>
    <Header onBack={onBack} />
    <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>신규 상품/자원 등록하기</Text>
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
      <FormField label="정가/원가" error={error(regular)} message="정가/원가를 입력해주세요.">
        <MoneyInput value={regular} onChange={v => digits(v, setRegular)} error={error(regular)} />
      </FormField>
      <FormField label="최소 판매가" error={error(minimum)} message="최소 판매가를 입력해주세요.">
        <MoneyInput value={minimum} onChange={v => digits(v, setMinimum)} error={error(minimum)} />
      </FormField>
      <View style={s.timeRow}>
        <View style={s.timeCell}><FormField label="판매 시작 시각" error={error(start)}><Select value={start} placeholder="시각 선택" onPress={() => setSheet('start')} error={error(start)} /></FormField></View>
        <View style={s.timeCell}><FormField label="판매 마감 시각" error={error(end)}><Select value={end} placeholder="시각 선택" onPress={() => setSheet('end')} error={error(end)} /></FormField></View>
      </View>
      <FormField label="매장 위치" error={error(location)} message="상품/자원을 등록할 매장을 선택해주세요.">
        <Select value={location} placeholder="매장 선택" onPress={() => setSheet('location')} error={error(location)} />
      </FormField>
      <Pressable disabled={saving} style={[s.submit, (!valid || saving) && s.submitDisabled]} onPress={submit}>
        <Text style={[s.submitText, (!valid || saving) && s.submitTextDisabled]}>{saving ? '등록 중...' : '상품/자원 등록하기'}</Text>
      </Pressable>
      {requestError ? <Text style={s.requestError}>{requestError}</Text> : null}
    </ScrollView>
    <ChoiceSheet
      kind={sheet}
      options={sheet === 'category' ? Object.keys(categoryTypes) : sheet === 'type' ? types : sheet === 'location' ? locations : times}
      selected={sheet === 'category' ? category ?? '' : sheet === 'type' ? type : sheet === 'location' ? location : sheet === 'start' ? start : end}
      onClose={() => setSheet(null)}
      onSelect={value => {
        if (sheet === 'category') { setCategory(value as Category); setType(''); }
        if (sheet === 'type') setType(value);
        if (sheet === 'start') setStart(value);
        if (sheet === 'end') setEnd(value);
        if (sheet === 'location') setLocation(value);
        setSheet(null);
      }}
    />
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
  return <View style={s.complete}><View style={s.completeBody}><Character width={184} height={184} /><Text style={s.completeTitle}>상품 등록 완료!</Text><Text style={s.completeText}>AI 추천가를 확인하고, 매장 운영의 효율성을 극대화해보세요.</Text></View><Pressable style={s.submit} onPress={onDone}><Text style={s.submitText}>판매자 홈으로 가기</Text></Pressable></View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.white}, header:{height:56,borderBottomWidth:1,borderBottomColor:colors.g200,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, headerTitle:{fontSize:16,fontWeight:'600',color:colors.black},
  form:{padding:16,paddingBottom:100,gap:24}, title:{fontSize:20,fontWeight:'600',color:colors.black}, field:{gap:8}, label:{fontSize:14,fontWeight:'500',color:colors.black}, required:{color:colors.primary500}, input:{height:52,borderWidth:1,borderColor:colors.g300,borderRadius:radius.sm,paddingHorizontal:14,fontSize:16,color:colors.black,backgroundColor:colors.white}, inputError:{borderColor:colors.danger}, errorText:{fontSize:12,color:colors.danger},
  select:{height:52,borderWidth:1,borderColor:colors.g300,borderRadius:radius.sm,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:colors.white}, selectDisabled:{backgroundColor:colors.g100,borderColor:colors.g200}, selectText:{flex:1,fontSize:16,color:colors.black}, placeholder:{color:colors.g400}, money:{flexDirection:'row',alignItems:'center',gap:10}, moneyInput:{flex:1}, won:{fontSize:16,color:colors.black,paddingHorizontal:8}, timeRow:{flexDirection:'row',gap:12}, timeCell:{flex:1},
  submit:{height:56,borderRadius:radius.md,backgroundColor:colors.primary500,alignItems:'center',justifyContent:'center',marginTop:8}, submitDisabled:{backgroundColor:colors.g200}, submitText:{fontSize:16,fontWeight:'600',color:colors.white}, submitTextDisabled:{color:colors.g400}, requestError:{fontSize:12,lineHeight:18,color:colors.danger,textAlign:'center'},
  overlay:{flex:1,backgroundColor:'rgba(17,17,17,.28)',justifyContent:'flex-end',alignItems:'center'}, sheet:{width:'100%',maxWidth:402,maxHeight:'72%',backgroundColor:colors.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,paddingBottom:28}, sheetHead:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}, sheetTitle:{fontSize:18,fontWeight:'600',color:colors.black}, sheetHint:{fontSize:12,color:colors.g500,marginTop:5}, options:{maxHeight:450}, option:{minHeight:54,borderBottomWidth:1,borderBottomColor:colors.g200,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, optionText:{fontSize:16,color:colors.g800}, optionSelected:{fontWeight:'600',color:colors.primary700}, radio:{width:24,height:24,borderRadius:12,borderWidth:2,borderColor:colors.g300,alignItems:'center',justifyContent:'center'}, radioOn:{borderColor:colors.primary500}, radioDot:{width:12,height:12,borderRadius:6,backgroundColor:colors.primary500},
  complete:{flex:1,backgroundColor:colors.white,padding:16,justifyContent:'space-between'}, completeBody:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:12}, completeTitle:{fontSize:28,fontWeight:'700',color:colors.black,marginTop:16}, completeText:{fontSize:16,lineHeight:24,color:colors.g500,textAlign:'center',marginTop:10},
});

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import CalendarIcon from '../../icon/calendar.svg';
import ChevronDown from '../../icon/chevron_down.svg';
import ChevronLeft from '../../icon/chevron_left.svg';
import ChevronRight from '../../icon/chevron_right.svg';
import Character from '../../icon/로컬타임_캐릭터 1.svg';
import { sellerApi } from '../api';

type Sale = { id: number; name: string; detail: string; quantity: number; revenue: number };
const money = (value: number) => `${value.toLocaleString()}원`;

export function SalesReportScreen({ onBack }: { onBack: () => void }) {
  const [salesData,setSalesData]=useState<Sale[]>([]);
  const [calendar, setCalendar] = useState(false);
  const [start, setStart] = useState<number | null>(10);
  const [end, setEnd] = useState<number | null>(null);
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  const [sortDesc, setSortDesc] = useState(true);
  useEffect(()=>{const today=new Date().toISOString().slice(0,10);sellerApi.salesReport({startDate:today,endDate:today}).then(report=>setSalesData(report.items.map((item,index)=>({id:item.productId??index,name:item.productName,detail:'판매 완료',quantity:item.quantity,revenue:item.revenue})))).catch(()=>setSalesData([]))},[]);
  const shown = useMemo(() => sortDesc ? [...salesData].sort((a, b) => b.revenue - a.revenue) : [...salesData].sort((a, b) => a.revenue - b.revenue), [salesData,sortDesc]);
  const total = salesData.reduce((sum, item) => sum + item.revenue, 0);
  return <View style={s.root}>
    <Header onBack={onBack} />
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.summary}><Text style={s.summaryLabel}>당일 판매 결과는</Text><View style={s.totalRow}><Text style={s.total}>{money(total)}</Text><Text style={s.summaryLabel}>입니다.</Text></View><Text style={s.helper}>예약 확정 시 자동으로 재고가 차감되며, 오늘 매출 집계에 포함됩니다.</Text></View>
      <Pressable style={s.rangeField} onPress={() => setCalendar(true)}><CalendarIcon width={24} height={24} color={colors.g400}/><Text style={s.rangeText}>2026.07.{String(range?.start ?? 10).padStart(2, '0')}</Text><Text style={s.dash}>-</Text><Text style={[s.rangeText, !range && s.placeholder]}>{range ? `2026.07.${String(range.end).padStart(2, '0')}` : 'YYYY.MM.DD'}</Text><ChevronDown width={24} height={24} color={colors.g400}/></Pressable>
      <Pressable style={s.sort} onPress={() => setSortDesc(value => !value)}><Text style={s.sortText}>{sortDesc ? '높은 매출순' : '낮은 매출순'}</Text><ChevronDown width={18} height={18} color={colors.g500}/></Pressable>
      {shown.length ? shown.map(item => <SaleCard key={item.id} item={item}/>) : <EmptyState/>}
    </ScrollView>
    <CalendarSheet visible={calendar} start={start} end={end} onDate={day => { if (start === null || end !== null || day < start) { setStart(day); setEnd(null); } else setEnd(day); }} onClose={() => setCalendar(false)} onApply={() => { if (start !== null && end !== null) setRange({ start, end }); setCalendar(false); }}/>
  </View>;
}

function Header({ onBack }: { onBack: () => void }) { return <View style={s.header}><Pressable hitSlop={10} onPress={onBack}><ChevronLeft width={24} height={24} color={colors.black}/></Pressable><Text style={s.headerTitle}>당일 매출 집계 · 리포트</Text><View style={{ width: 24 }}/></View>; }
function SaleCard({ item }: { item: Sale }) { return <View style={s.card}><View style={s.cardTitleRow}><View style={{ flex: 1 }}><Text style={s.cardTitle}>{item.name}</Text><Text style={s.cardDetail}>{item.detail}</Text></View><ChevronRight width={20} height={20} color={colors.g400}/></View><Text style={s.cardLine}>총 판매 수량  <Text style={s.accent}>{item.quantity}개</Text></Text><Text style={s.cardLine}>총 매출  <Text style={s.accent}>{money(item.revenue)}</Text></Text></View>; }
function EmptyState() { return <View style={s.empty}><Character width={112} height={112}/><Text style={s.emptyTitle}>등록된 상품/자원이 없어요.</Text><Text style={s.emptyBody}>당일 폐기되는 상품이나 빈 객실을 등록해 보세요!</Text></View>; }

function CalendarSheet({ visible, start, end, onDate, onClose, onApply }: { visible: boolean; start: number | null; end: number | null; onDate: (day: number) => void; onClose: () => void; onApply: () => void }) {
  const cells = [28,29,30,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,1];
  return <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}><Pressable style={s.overlay} onPress={onClose}><Pressable style={s.sheet} onPress={() => undefined}><View style={s.handle}/>
    <View style={s.sheetRange}><CalendarIcon width={24} height={24} color={colors.g400}/><Text style={s.sheetRangeText}>{start ? `2026.07.${String(start).padStart(2, '0')}` : 'YYYY.MM.DD'}</Text><Text style={s.dash}>-</Text><Text style={[s.sheetRangeText, !end && s.placeholder]}>{end ? `2026.07.${String(end).padStart(2, '0')}` : 'YYYY.MM.DD'}</Text><ChevronDown width={24} height={24} color={colors.g400}/></View>
    <View style={s.monthRow}><Text style={s.monthArrow}>‹</Text><Text style={s.month}>2026년 7월</Text><Text style={s.monthArrow}>›</Text></View>
    <View style={s.week}>{['일','월','화','수','목','금','토'].map(day => <Text key={day} style={s.weekText}>{day}</Text>)}</View>
    <View style={s.days}>{cells.map((day, index) => { const current = index >= 3 && index <= 33; const isStart = current && start !== null && day === start; const isEnd = current && end !== null && day === end; const selected = isStart || isEnd; const hasRange = start !== null && end !== null; const between = current && hasRange && day > start && day < end; return <Pressable key={`${day}-${index}`} disabled={!current} onPress={() => onDate(day)} style={s.dayCell}>{between ? <View style={s.rangeFull}/> : null}{isStart && hasRange ? <View style={s.rangeFromStart}/> : null}{isEnd && hasRange ? <View style={s.rangeToEnd}/> : null}<View style={[s.dayCircle, selected && s.daySelected]}><Text style={[s.dayText, !current && s.outside, selected && s.daySelectedText]}>{day}</Text></View></Pressable>; })}</View>
    <Pressable disabled={start === null || end === null} onPress={onApply} style={[s.apply, (start === null || end === null) && s.applyDisabled]}><Text style={[s.applyText, (start === null || end === null) && s.applyTextDisabled]}>조회하기</Text></Pressable>
  </Pressable></Pressable></Modal>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.white},header:{height:56,borderBottomWidth:1,borderBottomColor:colors.g200,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},headerTitle:{fontSize:16,fontWeight:'600'},content:{padding:16,paddingBottom:40},summary:{gap:5,marginTop:8,marginBottom:18},summaryLabel:{fontSize:18,fontWeight:'600'},totalRow:{flexDirection:'row',alignItems:'center',gap:12},total:{fontSize:32,fontWeight:'700',color:colors.info},helper:{fontSize:12,color:colors.g600},rangeField:{height:52,borderWidth:1,borderColor:colors.g200,borderRadius:26,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:9},rangeText:{flex:1,fontSize:14,color:colors.black},placeholder:{color:colors.g400},dash:{color:colors.g400},sort:{height:42,flexDirection:'row',alignItems:'center',justifyContent:'flex-end'},sortText:{fontSize:12,color:colors.g500},card:{borderWidth:1,borderColor:colors.g300,borderRadius:radius.lg,padding:12,marginBottom:8,gap:8},cardTitleRow:{flexDirection:'row',alignItems:'center'},cardTitle:{fontSize:20,fontWeight:'600'},cardDetail:{fontSize:12,color:colors.g500,marginTop:5},cardLine:{fontSize:14,fontWeight:'500'},accent:{color:colors.primary500,fontWeight:'600'},empty:{paddingTop:150,alignItems:'center',gap:7},emptyTitle:{fontSize:18,fontWeight:'600',color:colors.g600},emptyBody:{fontSize:12,color:colors.g500},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,.25)',justifyContent:'flex-end',alignItems:'center'},sheet:{width:'100%',maxWidth:402,height:588,backgroundColor:colors.white,borderTopLeftRadius:24,borderTopRightRadius:24,paddingHorizontal:16,paddingTop:12},handle:{width:60,height:4,borderRadius:2,backgroundColor:colors.g200,alignSelf:'center',marginBottom:40},sheetRange:{height:52,borderWidth:1,borderColor:colors.g200,borderRadius:26,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:9},sheetRangeText:{flex:1,fontSize:14},monthRow:{height:76,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},month:{fontSize:16,fontWeight:'600'},monthArrow:{fontSize:34,fontWeight:'300'},week:{height:36,borderBottomWidth:1,borderBottomColor:colors.g300,flexDirection:'row'},weekText:{width:'14.285%',fontSize:12,color:colors.g300,textAlign:'center'},days:{flexDirection:'row',flexWrap:'wrap'},dayCell:{width:'14.285%',height:52,alignItems:'center',justifyContent:'center',position:'relative'},rangeFull:{position:'absolute',left:0,right:0,top:12,bottom:12,backgroundColor:'#ffdc9b'},rangeFromStart:{position:'absolute',left:'50%',right:0,top:12,bottom:12,backgroundColor:'#ffdc9b'},rangeToEnd:{position:'absolute',left:0,right:'50%',top:12,bottom:12,backgroundColor:'#ffdc9b'},dayCircle:{width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center',zIndex:1},daySelected:{backgroundColor:colors.primary500},dayText:{fontSize:14,color:colors.g800},outside:{color:colors.g300},daySelectedText:{color:colors.white,fontWeight:'600'},apply:{height:56,borderRadius:radius.md,backgroundColor:colors.primary500,alignItems:'center',justifyContent:'center',marginTop:20},applyDisabled:{backgroundColor:colors.g200},applyText:{fontSize:16,fontWeight:'600',color:colors.white},applyTextDisabled:{color:colors.g400},
});

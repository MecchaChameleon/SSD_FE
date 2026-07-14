import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import ChevronLeft from '../../icon/chevron_left.svg';
import Character from '../../icon/로컬타임_캐릭터 1.svg';
import { sellerApi, type SalesReport } from '../api/seller';

const money = (value: number) => `${value.toLocaleString()}원`;
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

export function SalesReportScreen({ onBack, startDate, endDate }: { onBack: () => void; startDate?: string; endDate?: string }) {
  const start = startDate ?? today();
  const end = endDate ?? today();
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  const refresh = useCallback(async () => {
    try { setReport(await sellerApi.salesReport({ startDate: start, endDate: end })); }
    catch { setReport(null); }
    finally { setLoading(false); }
  }, [start, end]);

  useEffect(() => { void refresh(); }, [refresh]);
  const gross = report?.settlementRevenue ?? 0;
  const platformFee = Math.round(gross * .03);
  const paymentFee = Math.round(gross * .02);
  const settlement = gross - platformFee - paymentFee;

  const requestSettlement = async () => {
    if (!gross || submitting) return;
    setSubmitting(true);
    try {
      await sellerApi.requestSettlement({ startDate: start, endDate: end });
      setComplete(true);
    } catch (error) {
      Alert.alert('정산 신청 실패', error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.');
    } finally { setSubmitting(false); }
  };

  if (complete) return <SettlementComplete onConfirm={onBack} />;
  return <View style={s.root}>
    <Header onBack={onBack} />
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Section title="등록된 계좌 정보" compact>
        <Text style={s.account}>{report?.bankName && report?.accountNumber ? `${report.bankName} ${report.accountNumber}` : '등록된 계좌 정보가 없어요.'}</Text>
      </Section>
      <Section title="당일 총 매출" hint="ⓘ 예약 확정 시 자동으로 재고가 차감되며, 당일 매출 집계에 포함됩니다.">
        {loading ? <ActivityIndicator color={colors.primary500} style={s.empty}/> : report?.items.length ? <View style={s.table}>
          {report.items.map(item => <View key={item.productId} style={s.item}>
            <Row label="상품명" value={item.productName}/><Row label="판매 수량" value={`${item.quantity}개`}/><Row label="매출" value={money(item.revenue)}/>
          </View>)}
          <TotalRow label="당일 총 매출" value={money(report.totalRevenue)}/>
        </View> : <Empty text="오늘 판매된 내역이 없어요."/>}
      </Section>
      <Section title="정산 금액 계산">
        {gross ? <View style={s.table}><View style={s.fees}><Row label="플랫폼 수수료" value={`-${money(platformFee)}`} muted/><Row label="결제 수수료" value={`-${money(paymentFee)}`} muted/></View><TotalRow label="정산 금액" value={money(settlement)} accent/></View> : <Empty text="오늘 판매된 내역이 없어요."/>}
      </Section>
    </ScrollView>
    <View style={s.bottom}><Pressable disabled={!gross || submitting} onPress={requestSettlement} style={[s.button, (!gross || submitting) && s.buttonDisabled]}>{submitting ? <ActivityIndicator color={colors.white}/> : <Text style={[s.buttonText, !gross && s.buttonTextDisabled]}>정산 받기</Text>}</Pressable></View>
  </View>;
}

function Header({onBack}:{onBack:()=>void}) { return <View style={s.header}><Pressable hitSlop={10} onPress={onBack}><ChevronLeft width={24} height={24} color={colors.black}/></Pressable><Text style={s.headerTitle}>당일 매출 · 정산 금액</Text><View style={{width:24}}/></View>; }
function Section({title,hint,compact,children}:{title:string;hint?:string;compact?:boolean;children:React.ReactNode}) { return <View style={[s.section,compact&&s.compact]}><View style={s.sectionHead}><Text style={s.sectionTitle}>{title}</Text>{hint?<Text style={s.hint}>{hint}</Text>:null}</View>{children}</View>; }
function Row({label,value,muted}:{label:string;value:string;muted?:boolean}) { return <View style={s.row}><Text style={[s.label,muted&&s.muted]}>{label}</Text><Text numberOfLines={1} style={[s.value,muted&&s.muted]}>{value}</Text></View>; }
function TotalRow({label,value,accent}:{label:string;value:string;accent?:boolean}) { return <View style={s.totalRow}><Text style={s.totalLabel}>{label}</Text><Text style={[s.totalValue,accent&&s.accent]}>{value}</Text></View>; }
function Empty({text}:{text:string}) { return <View style={s.empty}><Text style={s.emptyText}>{text}</Text></View>; }
function SettlementComplete({onConfirm}:{onConfirm:()=>void}) { return <View style={s.complete}><View style={s.completeBody}><Character width={112} height={112}/><Text style={s.completeTitle}>정산 신청 완료!</Text><Text style={s.completeText}>신청한 정산 금액은 영업일 기준 3일 이내에{`\n`}등록된 계좌로 안전하게 입금됩니다.</Text></View><View style={s.bottom}><Pressable onPress={onConfirm} style={s.button}><Text style={s.buttonText}>확인</Text></Pressable></View></View>; }

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.white},header:{height:56,borderBottomWidth:1,borderBottomColor:colors.g200,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},headerTitle:{fontSize:16,fontWeight:'600',color:colors.black},content:{paddingHorizontal:16,paddingBottom:116},section:{marginTop:32,gap:16},compact:{marginTop:0,gap:0},sectionHead:{minHeight:52,borderBottomWidth:1,borderBottomColor:colors.g200,justifyContent:'center',gap:8},sectionTitle:{fontSize:18,fontWeight:'600',color:colors.black},hint:{fontSize:10,color:colors.g500},account:{height:48,textAlignVertical:'center',fontSize:14,fontWeight:'500',color:colors.g600},table:{borderTopWidth:2,borderBottomWidth:2,borderColor:colors.g200},item:{paddingVertical:4,borderBottomWidth:1,borderBottomColor:colors.g200},fees:{paddingVertical:4},row:{height:28,flexDirection:'row',alignItems:'center'},label:{width:128,fontSize:12,color:colors.g600},value:{flex:1,textAlign:'right',fontSize:14,fontWeight:'500',color:'#62615d'},muted:{fontSize:12,fontWeight:'400',color:colors.g600},totalRow:{height:48,flexDirection:'row',alignItems:'center'},totalLabel:{width:128,fontSize:14,fontWeight:'500',color:colors.black},totalValue:{flex:1,textAlign:'right',fontSize:16,fontWeight:'600',color:colors.black},accent:{fontSize:18,color:colors.info},empty:{height:84,alignItems:'center',justifyContent:'center'},emptyText:{fontSize:14,color:colors.g500},bottom:{position:'absolute',left:16,right:16,bottom:34},button:{height:56,borderRadius:radius.md,backgroundColor:colors.primary500,alignItems:'center',justifyContent:'center'},buttonDisabled:{backgroundColor:colors.g200},buttonText:{fontSize:16,fontWeight:'600',color:colors.white},buttonTextDisabled:{color:colors.g400},complete:{flex:1,backgroundColor:colors.white},completeBody:{position:'absolute',top:199,left:16,right:16,alignItems:'center'},completeTitle:{marginTop:18,fontSize:18,fontWeight:'600',color:colors.black},completeText:{marginTop:6,fontSize:14,lineHeight:19,textAlign:'center',color:colors.g800}
});

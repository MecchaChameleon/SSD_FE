import React,{useCallback,useEffect,useState} from 'react';
import { ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { Product,sellerApi } from '../api';
import type { AiPrice,PriceExplanation } from '../api/seller';
import { Toggle } from '../components/ui';
import { colors,radius } from '../theme';

const timeText=(value:string|null)=>value?new Date(value).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'-';
const weatherSource=(source:string)=>source==='KMA_ULTRA_SHORT'?'기상청 초단기':source==='OPEN_METEO_FALLBACK'?'대체 기상 데이터':'기본 날씨값';
const legacyWeatherFeatures=new Set(['rain_mm','wind_speed','temperature_gap']);
const normalizePriceExplanation=(value:AiPrice):AiPrice=>{
  const legacy=value.explanations.filter(item=>legacyWeatherFeatures.has(item.feature));
  if(!legacy.length)return value;
  const retained=value.explanations.filter(item=>!legacyWeatherFeatures.has(item.feature)&&item.feature!=='weather');
  const impact=legacy.reduce((sum,item)=>sum+item.impact,0);
  const weather:PriceExplanation={feature:'weather',label:'날씨',value:0,displayValue:value.weatherSummary,impact,direction:impact>0?'UP':impact<0?'DOWN':'NEUTRAL'};
  const explanations=[...retained,weather].sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact));
  const reason=explanations.slice(0,3).map(item=>`${item.label}이 가격을 ${item.impact>0?'높이는':'낮추는'} 방향으로 ${Math.abs(Math.round(item.impact)).toLocaleString()}원 작용`).join(' · ');
  return {...value,explanations,reason};
};

export function AIRecommendationScreen(){
  const[products,setProducts]=useState<Product[]>([]);
  const[selected,setSelected]=useState<number|null>(null);
  const[price,setPrice]=useState<AiPrice|null>(null);
  const[strategy,setStrategy]=useState('');
  const[message,setMessage]=useState('');
  const[loading,setLoading]=useState(false);
  const[changing,setChanging]=useState(false);

  const refreshProducts=useCallback(async()=>{
    const page=await sellerApi.products();
    setProducts(page.content);
    setSelected(current=>current&&page.content.some(item=>item.id===current)?current:(page.content[0]?.id??null));
  },[]);

  const refreshRecommendation=useCallback(async(id:number,showLoading=false)=>{
    if(showLoading)setLoading(true);
    try{
      const[next,plan]=await Promise.all([sellerApi.price(id),sellerApi.strategy(id)]);
      setPrice(normalizePriceExplanation(next));setStrategy(plan.message);setMessage('');
    }catch{
      setPrice(null);setStrategy('로컬 AI 서버 응답을 기다리고 있습니다.');
    }finally{setLoading(false)}
  },[]);

  useEffect(()=>{void refreshProducts().catch(()=>undefined);const timer=setInterval(()=>void refreshProducts().catch(()=>undefined),30_000);return()=>clearInterval(timer)},[refreshProducts]);
  useEffect(()=>{if(!selected){setPrice(null);return}void refreshRecommendation(selected,true);const timer=setInterval(()=>void refreshRecommendation(selected),30_000);return()=>clearInterval(timer)},[selected,refreshRecommendation]);

  const changeAuto=async(enabled:boolean)=>{
    if(!selected||changing)return;
    setChanging(true);
    try{
      await sellerApi.setAutoPricing(selected,enabled);
      await Promise.all([refreshRecommendation(selected),refreshProducts()]);
      setMessage(enabled?'AI가 지금 가격을 적용했고 10분마다 자동 갱신합니다.':'AI 실시간 가격 설정을 해제했습니다.');
    }catch{setMessage('자동 가격 설정을 변경하지 못했습니다. 로컬 AI 연결을 확인해 주세요.')}finally{setChanging(false)}
  };

  const apply=async()=>{
    if(!selected||!price)return;
    await sellerApi.applyPrice(selected,{price:price.currentPrice});
    await refreshProducts();
    setMessage('추천 가격을 상품에 적용했습니다.');
  };

  const maxImpact=Math.max(0,...(price?.explanations??[]).map(item=>Math.abs(item.impact)));
  const normalizedImpact=(impact:number)=>maxImpact===0?0:Math.abs(impact)/maxImpact*100;
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.title}>AI 추천가</Text>
    <Text style={s.body}>판매 상황·지역 수요·현재 시간·날씨를 반영해 가격을 계산합니다.</Text>
    {products.map(product=><Pressable key={product.id} onPress={()=>setSelected(product.id)} style={[s.product,selected===product.id&&s.selected]}><Text numberOfLines={1} style={s.productName}>{product.name}</Text><Text style={s.productPrice}>{product.currentPrice.toLocaleString()}원</Text></Pressable>)}
    {selected?<View style={s.card}>
      {loading?<ActivityIndicator color={colors.primary500}/>:<>
        <View style={s.row}><View><Text style={s.label}>현재 AI 추천가</Text><Text style={s.price}>{price?`${price.currentPrice.toLocaleString()}원`:'계산 대기 중'}</Text></View>{price?<View style={s.confidence}><Text style={s.confidenceValue}>{Math.round(price.confidence*100)}%</Text><Text style={s.confidenceLabel}>신뢰도</Text></View>:null}</View>
        {price?<Text style={s.discount}>{price.discountPct}% 할인 · 마감 {price.minutesLeft}분 전</Text>:null}
        {price?.weather?<View style={s.weatherCard}>
          <View style={s.weatherHeader}><Text style={s.weatherTitle}>실시간 제주 날씨</Text><Text style={s.weatherSource}>{weatherSource(price.weather.source)} · {timeText(price.weather.observedAt)}</Text></View>
          <View style={s.weatherRows}>
            <View style={s.weatherColumn}><Text style={s.weatherCaption}>현재</Text><Text style={s.weatherTemperature}>{price.weather.currentTemperature.toFixed(1)}°</Text><Text style={s.weatherDetail}>강수 {price.weather.currentPrecipitation.toFixed(1)}mm</Text><Text style={s.weatherDetail}>풍속 {price.weather.currentWindSpeed.toFixed(1)}m/s</Text></View>
            <View style={s.weatherDivider}/>
            <View style={s.weatherColumn}><Text style={s.weatherCaption}>3시간 내</Text><Text style={s.weatherTemperature}>{price.weather.forecastTemperature==null?'-':`${price.weather.forecastTemperature.toFixed(1)}°`}</Text><Text style={s.weatherDetail}>강수 {price.weather.forecastPrecipitation.toFixed(1)}mm</Text><Text style={s.weatherDetail}>풍속 {price.weather.forecastWindSpeed.toFixed(1)}m/s</Text></View>
          </View>
        </View>:price?<Text style={s.weatherFallback}>{price.weatherSummary}</Text>:null}
        {price?.regionalDemand?<View style={s.demandCard}>
          <View style={s.weatherHeader}><Text style={s.weatherTitle}>과거 3년 지역 수요</Text><Text style={s.weatherSource}>{price.regionalDemand.basisDate} 기준 예측</Text></View>
          <View style={s.demandRow}><View><Text style={s.weatherCaption}>{price.regionalDemand.region??'지역 미확인'}</Text><Text style={s.demandValue}>{price.regionalDemand.predictedVisitPopulation==null?'-':`${price.regionalDemand.predictedVisitPopulation.toLocaleString()}명`}</Text></View><View style={s.demandRank}><Text style={s.demandRankValue}>상위 {Math.max(1,Math.round((1-price.regionalDemand.percentile)*100))}%</Text><Text style={s.weatherCaption}>과거 동일 지역 대비</Text></View></View>
          {price.regionalDemand.trainingStartDate&&price.regionalDemand.trainingEndDate?<Text style={s.trainingPeriod}>EBM 학습 기간 {price.regionalDemand.trainingStartDate} ~ {price.regionalDemand.trainingEndDate} · 날짜·요일·공휴일·읍면동 반영</Text>:null}
        </View>:null}
        <View style={s.autoRow}><View style={s.autoCopy}><Text style={s.autoTitle}>AI 기반 실시간 가격</Text><Text style={s.autoDescription}>{price?.autoPricingEnabled?`다음 갱신 ${timeText(price.nextUpdateAt)}`:'켜면 즉시 적용 후 10분마다 갱신'}</Text></View><Toggle value={price?.autoPricingEnabled??false} onChange={changeAuto}/></View>
        {changing?<Text style={s.updating}>설정을 반영하는 중...</Text>:null}
        {price?.reason?<Text style={s.reason}>{price.reason}</Text>:null}
        {price?.explanations?.length?<View style={s.explainBox}><Text style={s.sectionTitle}>이 가격에 영향을 준 요인</Text>{price.explanations.map(item=><View key={item.feature} style={s.factor}><View style={s.factorHeader}><Text style={s.factorLabel}>{item.label}{item.displayValue?` (${item.displayValue})`:''}</Text><Text style={[s.impact,item.impact>=0?s.up:s.down]}>{item.impact>=0?'+':''}{Math.round(item.impact).toLocaleString()}원</Text></View><View style={s.track}><View style={[s.bar,{width:`${normalizedImpact(item.impact)}%`,backgroundColor:item.impact>=0?colors.info:colors.primary500}]}/></View></View>)}</View>:null}
        <Text style={s.strategy}>{strategy}</Text>
        <Pressable disabled={!price||price.autoPricingEnabled} onPress={apply} style={[s.button,(!price||price.autoPricingEnabled)&&s.disabled]}><Text style={s.buttonText}>{price?.autoPricingEnabled?'자동 가격 적용 중':'이번 추천가 적용'}</Text></Pressable>
        {price?<Text style={s.meta}>{price.modelVersion} · {price.explanationMethod==='SHAP_PERMUTATION'?'SHAP 설명':'대체 설명'} · 최근 적용 {timeText(price.lastUpdatedAt)}</Text>:null}
        {message?<Text style={s.message}>{message}</Text>:null}
      </>}
    </View>:<Text style={s.empty}>등록 상품이 없습니다.</Text>}
  </ScrollView>;
}

const s=StyleSheet.create({root:{padding:16,paddingBottom:110},title:{fontSize:22,fontWeight:'700'},body:{fontSize:13,color:colors.g500,marginTop:6,marginBottom:18},product:{height:54,paddingHorizontal:14,borderWidth:1,borderColor:colors.g200,borderRadius:radius.sm,marginBottom:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},selected:{borderColor:colors.primary500,backgroundColor:colors.primary100},productName:{fontSize:15,fontWeight:'600',flex:1,marginRight:12},productPrice:{fontSize:14},card:{marginTop:14,padding:18,borderRadius:radius.lg,backgroundColor:colors.g100},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},label:{fontSize:14,color:colors.g600},price:{fontSize:30,fontWeight:'700',color:colors.primary500,marginTop:6},confidence:{alignItems:'center',padding:8,minWidth:60,borderRadius:radius.md,backgroundColor:colors.white},confidenceValue:{fontWeight:'700',color:colors.info},confidenceLabel:{fontSize:10,color:colors.g500,marginTop:2},discount:{fontSize:12,color:colors.g600,marginTop:5},weatherCard:{backgroundColor:colors.white,borderRadius:radius.md,padding:14,marginTop:14},weatherHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},weatherTitle:{fontSize:14,fontWeight:'700'},weatherSource:{fontSize:10,color:colors.g500},weatherRows:{flexDirection:'row',alignItems:'stretch',marginTop:12},weatherColumn:{flex:1},weatherDivider:{width:1,backgroundColor:colors.g200,marginHorizontal:14},weatherCaption:{fontSize:11,color:colors.g500},weatherTemperature:{fontSize:23,fontWeight:'700',color:colors.info,marginVertical:4},weatherDetail:{fontSize:11,color:colors.g600,lineHeight:17},weatherFallback:{fontSize:12,color:colors.g600,marginTop:10},demandCard:{backgroundColor:colors.white,borderRadius:radius.md,padding:14,marginTop:10},demandRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:12},demandValue:{fontSize:22,fontWeight:'700',color:colors.primary700,marginTop:4},demandRank:{alignItems:'flex-end'},demandRankValue:{fontSize:15,fontWeight:'700',color:colors.info,marginBottom:3},trainingPeriod:{fontSize:10,lineHeight:15,color:colors.g500,marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:colors.g200},autoRow:{flexDirection:'row',alignItems:'center',marginTop:18,paddingVertical:14,borderTopWidth:1,borderBottomWidth:1,borderColor:colors.g200},autoCopy:{flex:1,paddingRight:12},autoTitle:{fontSize:15,fontWeight:'700'},autoDescription:{fontSize:12,color:colors.g500,marginTop:4},updating:{fontSize:11,color:colors.info,marginTop:6},reason:{fontSize:13,lineHeight:20,color:colors.g800,marginTop:16},explainBox:{backgroundColor:colors.white,borderRadius:radius.md,padding:14,marginTop:14},sectionTitle:{fontSize:14,fontWeight:'700',marginBottom:12},factor:{marginBottom:10},factorHeader:{flexDirection:'row',justifyContent:'space-between',marginBottom:5},factorLabel:{fontSize:12,color:colors.g800},impact:{fontSize:12,fontWeight:'700'},up:{color:colors.info},down:{color:colors.primary700},track:{height:5,borderRadius:3,backgroundColor:colors.g200,overflow:'hidden'},bar:{height:5,borderRadius:3},strategy:{fontSize:13,lineHeight:20,marginVertical:16,color:colors.g600},button:{height:52,borderRadius:radius.md,backgroundColor:colors.primary500,alignItems:'center',justifyContent:'center'},disabled:{backgroundColor:colors.g300},buttonText:{fontSize:15,fontWeight:'600',color:colors.white},meta:{fontSize:10,color:colors.g500,textAlign:'center',marginTop:10},message:{fontSize:12,color:colors.success,textAlign:'center',marginTop:10},empty:{textAlign:'center',color:colors.g500,marginTop:80}});

import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AiRecommendationResponse, ApiError, buyerApi, Product } from "../api";
import { useAppHeaderHeight } from "../components/home";
import { colors, fonts, radius } from "../theme";
import ChevronLeftIcon from "../../icon/chevron_left.svg";
import AiBrainIcon from "../../icon/ai-brain.svg";

export function BuyerAiRecommendationScreen({
  location,
  onBack,
  onSelect,
}: {
  location: { lat: number; lng: number } | null;
  onBack: () => void;
  onSelect: (product: Product) => void;
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AiRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const value = query.trim();
    if (!value || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await buyerApi.aiRecommendations({
        query: value,
        latitude: location?.lat,
        longitude: location?.lng,
      }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const { topInset, headerHeight } = useAppHeaderHeight();

  return (
    <View style={s.root}>
      <View style={[s.pageHeader, { paddingTop: topInset, height: headerHeight }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" onPress={onBack} hitSlop={10} style={s.back}>
          <ChevronLeftIcon width={24} height={24} color={colors.black} />
        </Pressable>
        <Text style={s.pageTitle}>AI 추천</Text>
        <View style={s.back} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.aiBadge}><AiBrainIcon width={46} height={46}/></View>
          <Text style={s.title}>나에게 딱 맞는 마감딜</Text>
          <Text style={s.subtitle}>위치, 시간, 예산과 날씨까지 한 번에 비교해 드려요.</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>어떤 상품을 찾고 있나요?</Text>
          <View style={s.inputBox}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              editable={!loading}
              maxLength={300}
              multiline
              placeholder="원하는 지역, 인원, 시간, 예산을 입력해 주세요."
              placeholderTextColor={colors.g400}
              style={s.input}
              onSubmitEditing={() => void submit()}
            />
            <Pressable
              disabled={!query.trim() || loading}
              onPress={() => void submit()}
              style={[s.submit, (!query.trim() || loading) && s.disabled]}
            >
              <Text style={s.submitText}>AI 추천받기</Text>
            </Pressable>
          </View>
          <Text style={s.example}>예: 애월 근처, 2명, 저녁 7시 이후, 4만 원 이하</Text>
        </View>

        {!location ? <Text style={s.locationHint}>위치 권한이 없어 거리 정보 없이 추천해요.</Text> : null}
        {error ? <Text style={s.error}>{error}</Text> : null}

        <View style={s.results}>
          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary500} />
              <Text style={s.loadingTitle}>조건에 맞는 마감딜을 찾고 있어요</Text>
              <Text style={s.loadingBody}>현재 판매 상품과 재고를 비교하는 중입니다.</Text>
            </View>
          ) : result ? (
            <>
              <View style={s.summary}>
                <Text style={s.summaryText}>{result.summary}</Text>
                {result.weatherSummary ? <Text style={s.weather}>현재 날씨 · {result.weatherSummary}</Text> : null}
              </View>
              {result.recommendations.map((item, index) => (
                <Pressable key={item.product.id} onPress={() => onSelect(item.product)} style={({pressed})=>[s.card,pressed&&s.cardPressed]}>
                  <View style={s.rankRow}>
                    <Text style={s.rank}>{index + 1}</Text>
                    <View style={s.nameBox}>
                      <Text style={s.name} numberOfLines={1}>{item.product.name}</Text>
                      <Text style={s.shop} numberOfLines={1}>{item.product.businessName} · {item.product.address}</Text>
                    </View>
                    <Text style={s.score}>{item.score}점</Text>
                  </View>
                  <View style={s.priceRow}>
                    <Text style={s.price}>{item.product.currentPrice.toLocaleString()}원</Text>
                    <Text style={s.original}>{item.product.price.toLocaleString()}원</Text>
                    <Text style={s.stock}>잔여 {item.product.qty}개</Text>
                  </View>
                  <View style={s.reasons}>
                    {item.reasons.map((reason, reasonIndex) => (
                      <Text key={`${reason.code}-${reasonIndex}`} style={s.reason}>✓ {reason.text}</Text>
                    ))}
                  </View>
                  <Text style={s.detail}>상품 자세히 보기 ›</Text>
                </Pressable>
              ))}
              {!result.recommendations.length ? <Text style={s.empty}>조건에 맞는 판매 상품이 없어요.</Text> : null}
            </>
          ) : (
            <View style={s.guide}>
              <Text style={s.guideTitle}>이런 조건을 함께 볼게요</Text>
              <Text style={s.guideText}>위치 · 이용 시간 · 예산 · 인원</Text>
              <Text style={s.guideText}>날씨 · 재고 · 마감시간 · 할인율</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.white},
  pageHeader:{height:56,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16},
  back:{width:24,height:36,alignItems:"center",justifyContent:"center"},
  pageTitle:{fontSize:16,fontFamily:fonts.semibold,fontWeight:"600",color:colors.black},
  content:{paddingHorizontal:14,paddingTop:18,paddingBottom:48},
  hero:{borderRadius:radius.lg,backgroundColor:colors.primary100,padding:22,alignItems:"center"},
  aiBadge:{width:46,height:46,alignItems:"center",justifyContent:"center",marginBottom:12},
  title:{fontSize:21,fontWeight:"700",color:colors.black},
  subtitle:{fontSize:13,lineHeight:19,color:colors.g600,marginTop:6,textAlign:"center"},
  section:{marginTop:24},
  sectionTitle:{fontSize:16,fontWeight:"700",color:colors.black,marginBottom:10},
  inputBox:{borderWidth:1,borderColor:colors.g300,borderRadius:radius.md,padding:12,backgroundColor:colors.white},
  input:{minHeight:70,fontSize:15,lineHeight:22,color:colors.black,textAlignVertical:"top"},
  submit:{height:48,borderRadius:radius.sm,backgroundColor:colors.primary500,alignItems:"center",justifyContent:"center",marginTop:10},
  disabled:{backgroundColor:colors.g300},
  submitText:{fontSize:15,fontWeight:"700",color:colors.white},
  example:{fontSize:11,color:colors.g500,marginTop:8},
  locationHint:{fontSize:11,color:colors.g500,marginTop:10},
  error:{fontSize:13,lineHeight:19,color:colors.danger,marginTop:12,padding:12,borderRadius:radius.sm,backgroundColor:"#fff1ef"},
  results:{paddingTop:18},
  loadingBox:{alignItems:"center",paddingVertical:48},
  loadingTitle:{fontSize:15,fontWeight:"700",color:colors.g800,marginTop:16},
  loadingBody:{fontSize:12,color:colors.g500,marginTop:6},
  summary:{padding:14,borderRadius:radius.md,backgroundColor:colors.primary100,marginBottom:12},
  summaryText:{fontSize:14,fontWeight:"600",color:colors.g800,lineHeight:20},
  weather:{fontSize:11,color:colors.g600,marginTop:6},
  card:{borderWidth:1,borderColor:colors.g200,borderRadius:radius.md,padding:15,marginBottom:12,backgroundColor:colors.white},
  cardPressed:{opacity:.7},
  rankRow:{flexDirection:"row",alignItems:"center"},
  rank:{width:28,height:28,borderRadius:14,textAlign:"center",lineHeight:28,backgroundColor:colors.primary500,color:colors.white,fontWeight:"700"},
  nameBox:{flex:1,marginLeft:10},
  name:{fontSize:16,fontWeight:"700",color:colors.black},
  shop:{fontSize:11,color:colors.g500,marginTop:3},
  score:{fontSize:13,fontWeight:"700",color:colors.primary700},
  priceRow:{flexDirection:"row",alignItems:"baseline",marginTop:13},
  price:{fontSize:18,fontWeight:"700",color:colors.primary500},
  original:{fontSize:12,color:colors.g400,textDecorationLine:"line-through",marginLeft:7},
  stock:{fontSize:11,color:colors.g600,marginLeft:"auto"},
  reasons:{marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:colors.g200,gap:5},
  reason:{fontSize:13,lineHeight:19,color:colors.g700},
  detail:{fontSize:12,fontWeight:"600",color:colors.primary700,textAlign:"right",marginTop:10},
  guide:{padding:18,borderRadius:radius.md,backgroundColor:colors.g100},
  guideTitle:{fontSize:14,fontWeight:"700",color:colors.g800,marginBottom:7},
  guideText:{fontSize:13,lineHeight:21,color:colors.g600},
  empty:{textAlign:"center",color:colors.g500,paddingVertical:30},
});

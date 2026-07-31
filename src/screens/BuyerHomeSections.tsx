import React, { useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { colors, fonts, radius, screen } from "../theme";
import { Chip } from "../components/ui";
import { Product } from "../components/home";
import MapPinIcon from "../../icon/map_pin_solid.svg";
import ChevronRightIcon from "../../icon/chevron_right.svg";
import QuickMenuBg from "../../icon/quick_menu_bg.svg";
import QuickMenuAi from "../../icon/quick_menu_ai.svg";
import QuickMenuNearby from "../../icon/quick_menu_nearby.svg";
import QuickMenuDeadline from "../../icon/quick_menu_deadline.svg";

// 배너/프로모는 연결된 API가 없어 더미 이미지로 채움 - imageUrl을 주면 그대로 렌더링됨
export type HeroBanner = { id: string; imageUrl?: string };
export const heroBanners: HeroBanner[] = [{ id: "b1" }, { id: "b2" }, { id: "b3" }];

const quickMenuItems = [
  { label: "AI 추천", Glyph: QuickMenuAi, glyphWidth: 28.17, glyphHeight: 24.81, glyphLeft: 9.74, glyphTop: 10.5 },
  { label: "내 근처", Glyph: QuickMenuNearby, glyphWidth: 18.24, glyphHeight: 23.63, glyphLeft: 15, glyphTop: 12 },
  { label: "마감 임박", Glyph: QuickMenuDeadline, glyphWidth: 25.06, glyphHeight: 25.06, glyphLeft: 11.26, glyphTop: 11.95 },
] as const;

const chunk = <T,>(items: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

export function HeroBannerCarousel() {
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();
  const frameWidth = Math.min(width, screen.designWidth) - 28;
  return (
    <View style={s.heroWrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width))
        }
      >
        {heroBanners.map((banner) =>
          banner.imageUrl ? (
            <Image key={banner.id} source={{ uri: banner.imageUrl }} style={[s.heroSlide, { width: frameWidth }]} />
          ) : (
            <View key={banner.id} style={[s.heroSlide, { width: frameWidth }]} />
          ),
        )}
      </ScrollView>
      {heroBanners.length > 1 ? (
        <View style={s.heroPageBadge}>
          <Text style={s.heroPageText}>{index + 1}/{heroBanners.length}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function QuickMenuRow({
  onAiRecommend,
  onSelect,
}: {
  onAiRecommend: () => void;
  onSelect?: (label: string) => void;
}) {
  return (
    <View style={s.quickRow}>
      {quickMenuItems.map(({ label, Glyph, glyphWidth, glyphHeight, glyphLeft, glyphTop }) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityLabel={label}
          hitSlop={6}
          style={({ pressed }) => [s.quickItem, pressed && s.quickItemPressed]}
          onPress={label === "AI 추천" ? onAiRecommend : () => onSelect?.(label)}
        >
          <View style={s.quickIconWrap}>
            <QuickMenuBg width={48} height={48} />
            <Glyph width={glyphWidth} height={glyphHeight} style={{ position: "absolute", left: glyphLeft, top: glyphTop }} />
          </View>
          <Text style={s.quickLabel}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function PreferenceSection({ products, onSelect }: { products: Product[]; onSelect: (product: Product) => void }) {
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();
  const frameWidth = Math.min(width, screen.designWidth) - 28;
  const pages = chunk(products, 4);
  if (!products.length) return null;
  return (
    <View style={s.section}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>내 취향 상품</Text>
        <ChevronRightIcon width={20} height={20} color={colors.g700} />
      </View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width))
        }
      >
        {pages.map((page, i) => (
          <View key={i} style={{ width: frameWidth, gap: 8 }}>
            {page.map((item) => (
              <Pressable key={item.id} onPress={() => onSelect(item)} style={s.prefRow}>
                {item.imageUrls?.[0] ? (
                  <Image source={{ uri: item.imageUrls[0] }} style={s.prefThumb} />
                ) : (
                  <View style={s.prefThumb} />
                )}
                <View style={s.prefInfo}>
                  <View style={s.prefNameRow}>
                    <Text numberOfLines={1} style={s.prefTitle}>{item.title}</Text>
                    {item.urgent ? (
                      <View style={s.prefTag}>
                        <Text style={s.prefTagText}>마감임박</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={s.prefStoreRow}>
                    <MapPinIcon width={14} height={14} color={colors.g600} />
                    <Text numberOfLines={1} style={s.prefShop}>{item.shop}</Text>
                  </View>
                  <View style={s.prefPriceRow}>
                    <View style={s.percentBadge}>
                      <Text style={s.percentBadgeText}>{item.discountRate ?? 0}%</Text>
                    </View>
                    <Text style={s.prefDiscountLabel}>{item.price}</Text>
                    <Text style={s.prefOriginalLabel}>{item.original}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
      {pages.length > 1 ? (
        <View style={s.dots}>
          {pages.map((_, i) => (
            <View key={i} style={[s.dot, index === i && s.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function RankedProductCard({ product, rank, onPress }: { product: Product; rank: number; onPress: () => void }) {
  const contents = (
    <>
      <View style={s.rankOverlay} />
      <View style={s.rankBadge}>
        <Text style={s.rankBadgeText}>{rank}</Text>
      </View>
      <View style={s.rankContents}>
        <Text numberOfLines={1} style={s.rankTitle}>{product.title}</Text>
        <View style={s.rankPriceRow}>
          <View style={s.percentBadge}>
            <Text style={s.percentBadgeText}>{product.discountRate ?? 0}%</Text>
          </View>
          <Text style={s.rankPrice}>{product.price}</Text>
          <Text style={s.rankOriginal}>{product.original}</Text>
        </View>
      </View>
    </>
  );
  return (
    <Pressable onPress={onPress} style={s.rankCard}>
      {product.imageUrls?.[0] ? (
        <ImageBackground source={{ uri: product.imageUrls[0] }} style={s.rankCardImage} imageStyle={{ borderRadius: radius.sm }}>
          {contents}
        </ImageBackground>
      ) : (
        <View style={[s.rankCardImage, { backgroundColor: colors.g100 }]}>{contents}</View>
      )}
    </Pressable>
  );
}

export function PopularProductsSection<T extends string>({
  categories,
  category,
  onCategory,
  sortSlot,
  children,
}: {
  categories: readonly T[];
  category: T;
  onCategory: (category: T) => void;
  sortSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const rows = chunk(React.Children.toArray(children), 4);
  return (
    <View style={s.section}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>현재 인기 상품</Text>
        {sortSlot}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {categories.map((c) => (
          <Chip key={c} selected={category === c} onPress={() => onCategory(c)}>
            {c}
          </Chip>
        ))}
      </ScrollView>
      {rows.length ? (
        <View style={{ gap: 12 }}>
          {rows.map((row, i) => (
            <ScrollView key={i} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rankRow}>
              {row}
            </ScrollView>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function PromoBanner({ title, subtitle, imageUrl }: { title: string; subtitle: string; imageUrl?: string }) {
  return (
    <View style={s.promoBanner}>
      {imageUrl ? <Image source={{ uri: imageUrl }} style={s.promoFallback} /> : <View style={s.promoFallback} />}
      <View style={s.promoText}>
        <Text style={s.promoTitle}>{title}</Text>
        <Text style={s.promoSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

export function NewArrivalsSection({ items, onSelect }: { items: Product[]; onSelect: (product: Product) => void }) {
  if (!items.length) return null;
  return (
    <View style={s.section}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>신규 상품 · 자원을 확인해 보세요</Text>
        <ChevronRightIcon width={20} height={20} color={colors.g700} />
      </View>
      <View style={s.newGrid}>
        {items.map((item) => (
          <Pressable key={item.id} onPress={() => onSelect(item)} style={s.newCard}>
            {item.imageUrls?.[0] ? (
              <Image source={{ uri: item.imageUrls[0] }} style={s.newImage} />
            ) : (
              <View style={s.newImage} />
            )}
            <Text numberOfLines={1} style={s.newTitle}>{item.title}</Text>
            <View style={s.newStoreRow}>
              <MapPinIcon width={14} height={14} color={colors.g600} />
              <Text numberOfLines={1} style={s.newShop}>{item.shop}</Text>
            </View>
            <Text style={s.newPrice}>{item.price}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  heroWrap: { marginBottom: 20 },
  heroSlide: { height: 299, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.g100 },
  heroPageBadge: { position: "absolute", right: 24, bottom: 14, height: 20, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: "rgba(98,97,93,0.5)", alignItems: "center", justifyContent: "center" },
  heroPageText: { fontSize: 10, fontFamily: fonts.semibold, fontWeight: "600", color: colors.white },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.g300 },
  dotOn: { backgroundColor: colors.g700 },
  quickRow: { flexDirection: "row", justifyContent: "space-between", gap: 16, marginBottom: 20 },
  quickItem: { flex: 1, height: 104, borderRadius: radius.lg, backgroundColor: "#f8f8f8", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  quickItemPressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  quickIconWrap: { width: 48, height: 48 },
  quickLabel: { fontSize: 12, fontFamily: fonts.semibold, fontWeight: "600", color: colors.g700 },
  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.bold, fontWeight: "700", color: colors.black },
  prefRow: { flexDirection: "row", alignItems: "center", gap: 12, height: 112 },
  prefThumb: { width: 112, height: 112, borderRadius: radius.sm, backgroundColor: colors.g100 },
  prefInfo: { flex: 1, gap: 4 },
  prefNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  prefTitle: { fontSize: 14, fontFamily: fonts.semibold, fontWeight: "600", color: colors.black },
  prefTag: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.primary500 },
  prefTagText: { fontSize: 12, fontFamily: fonts.semibold, fontWeight: "600", color: colors.white },
  prefStoreRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  prefShop: { fontSize: 10, fontFamily: fonts.regular, color: colors.g600 },
  prefPriceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  percentBadge: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: colors.info },
  percentBadgeText: { fontSize: 12, fontFamily: fonts.semibold, fontWeight: "600", color: colors.white },
  prefDiscountLabel: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: "600", color: colors.info },
  prefOriginalLabel: { fontSize: 10, fontFamily: fonts.regular, color: colors.g600, textDecorationLine: "line-through" },
  chips: { gap: 8, paddingRight: 14, marginBottom: 12 },
  rankRow: { gap: 8, paddingRight: 14 },
  rankCard: { width: 200, height: 180, paddingBottom: 12, borderRadius: radius.lg },
  rankCardImage: { flex: 1, padding: 12, borderRadius: radius.sm, overflow: "hidden", justifyContent: "space-between" },
  rankOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.15)" },
  rankBadge: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.g800 },
  rankBadgeText: { fontSize: 12, fontFamily: fonts.semibold, fontWeight: "600", color: colors.white },
  rankContents: { gap: 8 },
  rankTitle: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: "600", color: colors.white },
  rankPriceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rankPrice: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: "600", color: colors.info },
  rankOriginal: { fontSize: 10, fontFamily: fonts.regular, color: colors.white },
  promoBanner: { height: 96, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.g100, flexDirection: "row", alignItems: "center", marginBottom: 24 },
  promoFallback: { width: 96, height: "100%", backgroundColor: colors.g200 },
  promoText: { flex: 1, paddingHorizontal: 16, gap: 4 },
  promoTitle: { fontSize: 12, fontFamily: fonts.regular, color: colors.g600 },
  promoSubtitle: { fontSize: 15, fontFamily: fonts.bold, fontWeight: "700", color: colors.black },
  newGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 20 },
  newCard: { width: "48.4%", gap: 6 },
  newImage: { width: "100%", height: 180, borderRadius: radius.md, backgroundColor: colors.g100 },
  newTitle: { fontSize: 14, fontFamily: fonts.semibold, fontWeight: "600", color: colors.black },
  newStoreRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  newShop: { fontSize: 10, fontFamily: fonts.regular, color: colors.g600 },
  newPrice: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: "600", color: colors.info },
});

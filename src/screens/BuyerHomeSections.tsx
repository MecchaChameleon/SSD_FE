import React, { useEffect, useRef, useState } from "react";
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
import { Product, getBadgeInfo } from "../components/home";
import MapPinIcon from "../../icon/map_pin_solid.svg";
import ChevronRightIcon from "../../icon/chevron_right.svg";
import ChevronDownIcon from "../../icon/chevron_down.svg";
import QuickMenuBg from "../../icon/quick_menu_bg.svg";
import QuickMenuAi from "../../icon/quick_menu_ai.svg";
import QuickMenuNearby from "../../icon/quick_menu_nearby.svg";
import QuickMenuDeadline from "../../icon/quick_menu_deadline.svg";

// 배너/프로모는 연결된 API가 없어 로컬 이미지로 채움 - imageUrl 또는 imageSource를 주면 그대로 렌더링됨
export type HeroBanner = { id: string; imageUrl?: string; imageSource?: any };
export const heroBanners: HeroBanner[] = [
  { id: "b1", imageSource: require("../../assets/images/hero_banner_1.jpg") },
  { id: "b2", imageSource: require("../../assets/images/hero_banner_2.jpg") },
  { id: "b3", imageSource: require("../../assets/images/hero_banner_3.jpg") },
];

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

export function HeroBannerCarousel({ autoPlayInterval = 3500 }: { autoPlayInterval?: number }) {
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();
  const frameWidth = Math.min(width, screen.designWidth) - 28;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (heroBanners.length <= 1) return;

    const timer = setInterval(() => {
      setIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % heroBanners.length;
        scrollRef.current?.scrollTo({
          x: nextIndex * frameWidth,
          animated: true,
        });
        return nextIndex;
      });
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [frameWidth, autoPlayInterval]);

  return (
    <View style={s.heroWrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / (event.nativeEvent.layoutMeasurement.width || frameWidth));
          setIndex(nextIndex);
        }}
      >
        {heroBanners.map((banner) => {
          const source = banner.imageSource || (banner.imageUrl ? { uri: banner.imageUrl } : null);
          return source ? (
            <Image key={banner.id} source={source} style={[s.heroSlide, { width: frameWidth }]} resizeMode="cover" />
          ) : (
            <View key={banner.id} style={[s.heroSlide, { width: frameWidth }]} />
          );
        })}
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

export function PreferenceSection({ products, onSelect, onSeeAll }: { products: Product[]; onSelect: (product: Product) => void; onSeeAll: () => void }) {
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();
  const frameWidth = Math.min(width, screen.designWidth) - 28;
  const pages = chunk(products, 4);
  if (!products.length) return null;
  return (
    <View style={s.section}>
      <Pressable onPress={onSeeAll} style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>내 취향 상품</Text>
        <ChevronRightIcon width={20} height={20} color={colors.g700} />
      </Pressable>
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
              <ProductListRow key={item.id} product={item} onPress={() => onSelect(item)} />
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

export function RankedProductCard({ product, rank, onPress, width = 200, height = 180 }: { product: Product; rank?: number; onPress: () => void; width?: number; height?: number }) {
  const contents = (
    <>
      <View style={s.rankOverlay} />
      {rank != null ? (
        <View style={s.rankBadge}>
          <Text style={s.rankBadgeText}>{rank}</Text>
        </View>
      ) : null}
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
    <Pressable onPress={onPress} style={[s.rankCard, { width, height }]}>
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
  onSeeAll,
  children,
}: {
  categories: readonly T[];
  category: T;
  onCategory: (category: T) => void;
  onSeeAll: () => void;
  children: React.ReactNode;
}) {
  const rows = chunk(React.Children.toArray(children), 4);
  return (
    <View style={s.section}>
      <Pressable onPress={onSeeAll} style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>현재 인기 상품</Text>
        <ChevronRightIcon width={20} height={20} color={colors.g700} />
      </Pressable>
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

export function PromoBanner({
  title,
  subtitle,
  imageUrl,
  imageSource = require("../../assets/images/promo_camping.png"),
}: {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  imageSource?: any;
}) {
  const source = imageSource || (imageUrl ? { uri: imageUrl } : null);

  if (source) {
    return (
      <View style={s.promoFullWrap}>
        <Image source={source} style={s.promoFullImage} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={s.promoBanner}>
      <View style={s.promoFallback} />
      <View style={s.promoText}>
        {title ? <Text style={s.promoTitle}>{title}</Text> : null}
        {subtitle ? <Text style={s.promoSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function NewArrivalsSection({ items, onSelect, onSeeAll }: { items: Product[]; onSelect: (product: Product) => void; onSeeAll: () => void }) {
  if (!items.length) return null;
  return (
    <View style={s.section}>
      <Pressable onPress={onSeeAll} style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>신규 상품 · 자원을 확인해 보세요</Text>
        <ChevronRightIcon width={20} height={20} color={colors.g700} />
      </Pressable>
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

export function SortDropdown<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (value: T) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.sortArea}>
      <Pressable onPress={() => setOpen((v) => !v)} style={s.sort}>
        <Text style={s.sortText}>{value}</Text>
        <ChevronDownIcon width={16} height={16} color={colors.g500} />
      </Pressable>
      {open ? (
        <View style={s.sortMenu}>
          {options.map((x) => (
            <Pressable key={x} onPress={() => { onChange(x); setOpen(false); }} style={s.sortOption}>
              <Text style={[s.sortOptionText, value === x && s.selectedSort]}>{x}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function CategoryTabs<T extends string>({ categories, category, onCategory }: { categories: readonly T[]; category: T; onCategory: (category: T) => void }) {
  return (
    <View style={s.tabs}>
      {categories.map((c) => (
        <Pressable key={c} onPress={() => onCategory(c)} style={[s.tab, category === c && s.tabOn]}>
          <Text numberOfLines={1} style={[s.tabText, category === c && s.tabTextOn]}>{c}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ProductListRow({ product, rank, onPress }: { product: Product; rank?: number; onPress: () => void }) {
  const badgeInfo = getBadgeInfo(product);

  return (
    <Pressable onPress={onPress} style={s.prefRow}>
      <View style={s.listThumbWrap}>
        {product.imageUrls?.[0] ? (
          <Image source={{ uri: product.imageUrls[0] }} style={s.prefThumb} />
        ) : (
          <View style={s.prefThumb} />
        )}
        {rank != null ? (
          <View style={s.listRankBadge}>
            <Text style={s.listRankBadgeText}>{rank}</Text>
          </View>
        ) : null}
      </View>
      <View style={s.prefInfo}>
        <View style={s.prefNameRow}>
          <Text numberOfLines={1} style={s.prefTitle}>{product.title}</Text>
          {badgeInfo ? (
            <View style={s.prefTag}>
              <Text style={s.prefTagText}>{badgeInfo.text}</Text>
            </View>
          ) : null}
        </View>
        <View style={s.prefStoreRow}>
          <MapPinIcon width={14} height={14} color={colors.g600} />
          <Text numberOfLines={1} style={s.prefShop}>{product.shop}</Text>
        </View>
        <View style={s.prefPriceRow}>
          <View style={s.percentBadge}>
            <Text style={s.percentBadgeText}>{product.discountRate ?? 0}%</Text>
          </View>
          <Text style={s.prefDiscountLabel}>{product.price}</Text>
          <Text style={s.prefOriginalLabel}>{product.original}</Text>
        </View>
      </View>
    </Pressable>
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
  prefNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  prefTitle: { flex: 1, fontSize: 14, fontFamily: fonts.semibold, fontWeight: "600", color: colors.black },
  prefTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.primary500, alignSelf: "flex-start" },
  prefTagText: { fontSize: 12, fontFamily: fonts.semibold, fontWeight: "600", color: colors.white },
  prefStoreRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  prefShop: { fontSize: 10, fontFamily: fonts.regular, color: colors.g600 },
  prefPriceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  percentBadge: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: colors.info },
  percentBadgeText: { fontSize: 10, fontFamily: fonts.semibold, fontWeight: "600", color: colors.white },
  prefDiscountLabel: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: "600", color: colors.info },
  prefOriginalLabel: { fontSize: 10, fontFamily: fonts.regular, color: colors.g600, textDecorationLine: "line-through" },
  chips: { gap: 8, paddingRight: 14, marginBottom: 12 },
  rankRow: { gap: 8, paddingRight: 14 },
  rankCard: { width: 200, height: 180, paddingBottom: 12, borderRadius: radius.lg },
  rankCardImage: { flex: 1, padding: 12, borderRadius: radius.sm, overflow: "hidden" },
  rankOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.15)" },
  rankBadge: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.g800 },
  rankBadgeText: { fontSize: 12, fontFamily: fonts.semibold, fontWeight: "600", color: colors.white },
  rankContents: { gap: 8, marginTop: "auto" },
  rankTitle: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: "600", color: colors.white },
  rankPriceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rankPrice: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: "600", color: colors.info },
  rankOriginal: { fontSize: 10, fontFamily: fonts.regular, color: colors.white },
  promoFullWrap: { marginHorizontal: -14, height: 96, marginBottom: 24, overflow: "hidden" },
  promoFullImage: { width: "100%", height: "100%" },
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
  sortArea: { position: "relative" },
  sort: { flexDirection: "row", alignItems: "center", gap: 2 },
  sortText: { fontSize: 12, fontFamily: fonts.regular, color: colors.g500 },
  sortMenu: {
    position: "absolute",
    right: 0,
    top: 28,
    width: 108,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingVertical: 2,
    zIndex: 30,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  sortOption: { minHeight: 42, paddingHorizontal: 12, justifyContent: "center" },
  sortOptionText: { fontSize: 11, fontFamily: fonts.regular, color: colors.g400 },
  selectedSort: { fontFamily: fonts.semibold, fontWeight: "600", color: colors.black },
  tabs: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.g200 },
  tab: { alignItems: "center", paddingHorizontal: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "transparent", marginBottom: -1 },
  tabOn: { borderBottomWidth: 2, borderBottomColor: colors.g900 },
  tabText: { fontSize: 14, fontFamily: fonts.regular, color: colors.g500 },
  tabTextOn: { color: colors.g900 },
  listThumbWrap: { width: 112, height: 112 },
  listRankBadge: { position: "absolute", left: 12, top: 12, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.g800 },
  listRankBadgeText: { fontSize: 12, fontFamily: fonts.semibold, fontWeight: "600", color: colors.white },
});

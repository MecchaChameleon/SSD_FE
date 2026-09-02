import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../theme";
import { buyerApi } from "../api";
import { Product } from "../components/home";
import { ProductListRow, RankedProductCard, SortDropdown } from "./BuyerHomeSections";
import { apiProductToCard, BuyerCategory, preloadProductImages, sortProductCards, sorts } from "./BuyerHomeScreen";
import ChevronLeftIcon from "../../icon/chevron_left.svg";
import ArrowUpIcon from "../../icon/arrow_up.svg";

export type ProductListMode = "preference" | "popular" | "new" | "nearby" | "deadline";

export function ProductListScreen({
  title,
  mode,
  initialSort = "할인율 높은순",
  userLocation,
  onBack,
  onSelectProduct,
}: {
  title: string;
  mode: ProductListMode;
  initialCategory?: BuyerCategory;
  initialSort?: (typeof sorts)[number];
  userLocation?: { lat: number; lng: number } | null;
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
}) {
  const [sort, setSort] = useState<(typeof sorts)[number]>(initialSort);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const rankMode = mode === "popular" || mode === "nearby" || mode === "deadline";
  const heroMode = mode === "nearby" || mode === "deadline";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const query =
      mode === "preference" ? { sort: "AI_RECOMMENDED" as const }
      : mode === "deadline" ? { sort: "DEADLINE_ASC" as const }
      : mode === "nearby" && userLocation ? { sort: "DISTANCE_ASC" as const, lat: userLocation.lat, lng: userLocation.lng }
      : {};

    buyerApi
      .products({ size: 50, ...query })
      .then(async (page) => {
        if (cancelled) return;
        let cards = page.content.map(apiProductToCard);
        if (mode === "new") {
          cards = [...cards].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
        }
        await preloadProductImages(sortProductCards(cards, sort), mode === "popular" ? 4 : 5);
        if (cancelled) return;
        setProducts(cards);
      })
      .catch(() => {
        if (cancelled) return;
        setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, sort, userLocation]);

  const grouped = (items: Product[]) => {
    const sorted = sortProductCards(items, sort);
    const result: { item: Product; index: number }[][] = [];
    let current: { item: Product; index: number }[] = [];
    sorted.forEach((item, index) => {
      current.push({ item, index });
      if (item.insight) {
        result.push(current);
        current = [];
      }
    });
    if (current.length) result.push(current);
    return { sorted, groups: result };
  };

  const { sorted, groups } = grouped(products);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.headerSide}>
          <Pressable hitSlop={10} onPress={onBack}>
            <ChevronLeftIcon width={24} height={24} color={colors.black} />
          </Pressable>
        </View>
        <Text style={[s.headerTitle, rankMode && s.headerTitleMedium]}>{title}</Text>
        <View style={s.headerSide} />
      </View>

      {!rankMode ? (
        <View style={s.sortRow}>
          <SortDropdown value={sort} options={sorts} onChange={setSort} />
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? null : sorted.length === 0 ? (
          <Text style={s.empty}>상품이 없습니다.</Text>
        ) : (
          <>
            {heroMode ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.heroRow}
              >
                {sorted.slice(0, 4).map((item, index) => (
                  <RankedProductCard
                    key={item.id}
                    product={item}
                    rank={index + 1}
                    width={224}
                    height={235}
                    onPress={() => onSelectProduct(item)}
                  />
                ))}
              </ScrollView>
            ) : null}
            {groups.map((group, gi) => (
              <View key={gi} style={s.group}>
                {group.map(({ item, index }) => (
                  <ProductListRow
                    key={item.id}
                    product={item}
                    rank={rankMode && !heroMode ? index + 1 : undefined}
                    onPress={() => onSelectProduct(item)}
                  />
                ))}
                {group[group.length - 1].item.insight ? (
                  <View style={s.insightBox}>
                    <Text numberOfLines={1} style={s.insightText}>{group[group.length - 1].item.insight}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Pressable
        accessibilityLabel="맨 위로"
        style={s.scrollTopButton}
        onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
      >
        <ArrowUpIcon width={24} height={24} color={colors.g700} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  headerSide: { width: 24 },
  headerTitle: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: "600", color: colors.black },
  headerTitleMedium: { fontFamily: fonts.medium, fontWeight: "500" },
  sortRow: { paddingHorizontal: 16, paddingTop: 10, alignItems: "flex-end" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  heroRow: { gap: 8, paddingTop: 32, paddingBottom: 16 },
  group: { gap: 8, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.g200 },
  insightBox: { alignItems: "center", justifyContent: "center", paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: "rgba(162,206,250,0.25)" },
  insightText: { fontSize: 12, fontFamily: fonts.regular, color: colors.g500, textAlign: "center" },
  empty: { paddingVertical: 80, textAlign: "center", fontFamily: fonts.regular, color: colors.g500 },
  scrollTopButton: {
    position: "absolute",
    right: 16,
    bottom: 24,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
});

import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { buyerApi } from "../api";
import { Product } from "../components/home";
import { CategoryTabs, ProductListRow, SortDropdown } from "./BuyerHomeSections";
import { apiProductToCard, BuyerCategory, businessTypeByCategory, categories, money, sorts } from "./BuyerHomeScreen";
import ChevronLeftIcon from "../../icon/chevron_left.svg";

export type ProductListMode = "preference" | "popular" | "new";

export function ProductListScreen({
  title,
  mode,
  initialCategory = "전체",
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
  const [category, setCategory] = useState<BuyerCategory>(initialCategory);
  const [sort, setSort] = useState<(typeof sorts)[number]>(initialSort);
  const [items, setItems] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const rankMode = mode === "popular";

  useEffect(() => {
    const businessType = businessTypeByCategory[category];
    const query = mode === "preference" ? { sort: "AI_RECOMMENDED" as const } : {};
    setLoaded(false);
    buyerApi
      .products({ size: 50, businessType, ...query })
      .then(async (page) => {
        if (page.content.length || !businessType) return page.content;
        const all = await buyerApi.products({ size: 50, ...query });
        return all.content.filter((product) => product.businessType === businessType);
      })
      .then((list) => {
        let cards = list.map(apiProductToCard);
        if (mode === "new") cards = [...cards].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
        setItems(cards);
      })
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, [mode, category]);

  const sorted = React.useMemo(() => {
    let list = items;
    if (sort === "할인율 높은순") list = [...list].sort((a, b) => (b.discountRate ?? 0) - (a.discountRate ?? 0));
    if (sort === "낮은 가격순") list = [...list].sort((a, b) => money(a.price) - money(b.price));
    if (sort === "높은 가격순") list = [...list].sort((a, b) => money(b.price) - money(a.price));
    if (sort === "마감 임박순") list = [...list].sort((a, b) => (a.deadlineAt ?? Number.MAX_SAFE_INTEGER) - (b.deadlineAt ?? Number.MAX_SAFE_INTEGER));
    if (sort === "가까운 거리순" && userLocation)
      list = [...list].sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER));
    return list;
  }, [items, sort, userLocation]);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.headerSide}>
          <Pressable hitSlop={10} onPress={onBack}>
            <ChevronLeftIcon width={24} height={24} color={colors.black} />
          </Pressable>
        </View>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={s.headerSide} />
      </View>
      <View style={s.tabRow}>
        <CategoryTabs categories={categories} category={category} onCategory={setCategory} />
      </View>
      {!rankMode ? (
        <View style={s.sortRow}>
          <SortDropdown value={sort} options={sorts} onChange={setSort} />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {!loaded ? null : sorted.length === 0 ? (
          <Text style={s.empty}>상품이 없습니다.</Text>
        ) : (
          sorted.map((item, index) => (
            <ProductListRow
              key={item.id}
              product={item}
              rank={rankMode ? index + 1 : undefined}
              onPress={() => onSelectProduct(item)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  headerSide: { width: 24 },
  headerTitle: { fontSize: 17, fontFamily: fonts.semibold, fontWeight: "600", color: colors.black },
  tabRow: { paddingHorizontal: 16 },
  sortRow: { paddingHorizontal: 16, paddingVertical: 10, alignItems: "flex-end" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { paddingVertical: 80, textAlign: "center", fontFamily: fonts.regular, color: colors.g500 },
});

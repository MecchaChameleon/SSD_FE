import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, fonts, radius } from "../theme";
import { buyerApi } from "../api";
import { Product } from "../components/home";
import { CategoryTabs, ProductListRow, RankedProductCard, SortDropdown } from "./BuyerHomeSections";
import { apiProductToCard, BuyerCategory, businessTypeByCategory, preloadProductImages, sortProductCards, sorts } from "./BuyerHomeScreen";
import ChevronLeftIcon from "../../icon/chevron_left.svg";
import ArrowUpIcon from "../../icon/arrow_up.svg";

export type ProductListMode = "preference" | "popular" | "new" | "nearby" | "deadline";

const listCategories: readonly BuyerCategory[] = ["전체", "음식점", "숙박", "체험", "렌탈 / 모빌리티"];

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
  const categoryCache = useRef(new Map<BuyerCategory, Product[]>());
  const [, setCacheVersion] = useState(0);
  const { width: viewportWidth } = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(viewportWidth);
  const pagerRef = useRef<ScrollView>(null);
  const pageScrollRefs = useRef(new Map<BuyerCategory, ScrollView>());
  const activeCategoryRef = useRef<BuyerCategory>(initialCategory);
  const swipeStartIndex = useRef<number | null>(null);
  const programmaticTarget = useRef<number | null>(null);
  const scrollSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rankMode = mode === "popular" || mode === "nearby" || mode === "deadline";
  const heroMode = mode === "nearby" || mode === "deadline";
  const moveToCategoryIndex = (index:number, animated = true) => {
    const nextIndex = Math.max(0, Math.min(listCategories.length - 1, index));
    const next = listCategories[nextIndex];
    programmaticTarget.current = nextIndex;
    activeCategoryRef.current = next;
    setCategory(next);
    pagerRef.current?.scrollTo({ x: nextIndex * pageWidth, animated });
  };
  const changeCategory = (next:BuyerCategory, scrollToPage = true) => {
    if (scrollToPage) {
      const nextIndex = listCategories.indexOf(next);
      if (nextIndex < 0 || next === activeCategoryRef.current) return;
      moveToCategoryIndex(nextIndex);
      return;
    }
    if (next === activeCategoryRef.current) return;
    activeCategoryRef.current = next;
    setCategory(next);
  };
  const settleSwipe = (offsetX:number, velocityX = 0) => {
    if (programmaticTarget.current != null) return;
    const startIndex = swipeStartIndex.current ?? listCategories.indexOf(activeCategoryRef.current);
    const delta = offsetX - startIndex * pageWidth;
    const direction = Math.abs(delta) >= pageWidth * 0.15 || Math.abs(velocityX) >= 0.2
      ? (delta !== 0 ? Math.sign(delta) : Math.sign(velocityX))
      : 0;
    moveToCategoryIndex(startIndex + direction);
  };

  useEffect(() => {
    let cancelled = false;
    const businessType = businessTypeByCategory[category];
    const query =
      mode === "preference" ? { sort: "AI_RECOMMENDED" as const }
      : mode === "deadline" ? { sort: "DEADLINE_ASC" as const }
      : mode === "nearby" && userLocation ? { sort: "DISTANCE_ASC" as const, lat: userLocation.lat, lng: userLocation.lng }
      : {};
    buyerApi
      .products({ size: 50, businessType, ...query })
      .then(async (page) => {
        if (page.content.length || !businessType) return page.content;
        const all = await buyerApi.products({ size: 50, ...query });
        return all.content.filter((product) => product.businessType === businessType);
      })
      .then(async (list) => {
        if(cancelled)return;
        let cards = list.map(apiProductToCard);
        if (mode === "new") cards = [...cards].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
        await preloadProductImages(sortProductCards(cards, sort), mode === "popular" ? 4 : 5);
        if(cancelled)return;
        categoryCache.current.set(category, cards);
        setCacheVersion(value=>value+1);
      })
      .catch(() => {
        if(cancelled)return;
        categoryCache.current.set(category, []);
        setCacheVersion(value=>value+1);
      });
    return()=>{cancelled=true};
  }, [mode, category, sort, userLocation]);

  useEffect(() => {
    categoryCache.current.clear();
    setCacheVersion(value=>value+1);
  }, [mode, sort, userLocation]);

  useEffect(() => {
    let cancelled = false;
    const query =
      mode === "preference" ? { sort: "AI_RECOMMENDED" as const }
      : mode === "deadline" ? { sort: "DEADLINE_ASC" as const }
      : mode === "nearby" && userLocation ? { sort: "DISTANCE_ASC" as const, lat: userLocation.lat, lng: userLocation.lng }
      : {};
    const preloadCount = mode === "popular" ? 4 : 5;
    const otherCategories = listCategories
      .filter((candidate) => candidate !== category)
      .map((candidate) => ({ candidate, businessType: businessTypeByCategory[candidate] }));
    void Promise.all(otherCategories.map(async ({ candidate, businessType }) => {
      const page = await buyerApi.products({ size: 50, businessType, ...query });
      let products = page.content;
      if (!products.length && businessType) {
        const all = await buyerApi.products({ size: 50, ...query });
        products = all.content.filter((product) => product.businessType === businessType);
      }
      if (cancelled) return;
      let cards = products.map(apiProductToCard);
      if (mode === "new") cards = [...cards].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
      await preloadProductImages(sortProductCards(cards, sort), preloadCount);
      if (!cancelled) {
        categoryCache.current.set(candidate, cards);
        setCacheVersion(value=>value+1);
      }
    })).catch(() => undefined);
    return () => { cancelled = true; };
  }, [mode, category, sort, userLocation]);

  const grouped = (products: Product[]) => {
    const sorted = sortProductCards(products, sort);
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

  useEffect(() => {
    pagerRef.current?.scrollTo({ x: listCategories.indexOf(category) * pageWidth, animated: false });
  }, [pageWidth]);

  useEffect(() => () => {
    if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current);
  }, []);

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
      <CategoryTabs categories={listCategories} category={category} onCategory={(next)=>changeCategory(next)} />
      {!rankMode ? (
        <View style={s.sortRow}>
          <SortDropdown value={sort} options={sorts} onChange={setSort} />
        </View>
      ) : null}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        snapToInterval={pageWidth}
        disableIntervalMomentum
        decelerationRate="fast"
        bounces={false}
        showsHorizontalScrollIndicator={false}
        style={s.categoryContent}
        scrollEventThrottle={16}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (nextWidth > 0 && nextWidth !== pageWidth) setPageWidth(nextWidth);
        }}
        onScrollBeginDrag={(event) => {
          if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current);
          programmaticTarget.current = null;
          swipeStartIndex.current = listCategories.indexOf(activeCategoryRef.current);
        }}
        onScroll={(event) => {
          if (programmaticTarget.current != null) return;
          if (swipeStartIndex.current == null) {
            swipeStartIndex.current = listCategories.indexOf(activeCategoryRef.current);
          }
          const offsetX = event.nativeEvent.contentOffset.x;
          if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current);
          scrollSettleTimer.current = setTimeout(() => settleSwipe(offsetX), 80);
        }}
        onScrollEndDrag={(event) => {
          if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current);
          settleSwipe(event.nativeEvent.contentOffset.x, event.nativeEvent.velocity?.x ?? 0);
        }}
        onMomentumScrollEnd={(event) => {
          if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current);
          if (programmaticTarget.current == null) {
            settleSwipe(event.nativeEvent.contentOffset.x);
            return;
          }
          const nextIndex = programmaticTarget.current;
          const expectedOffset = nextIndex * pageWidth;
          if (Math.abs(event.nativeEvent.contentOffset.x - expectedOffset) > 1) {
            pagerRef.current?.scrollTo({ x: expectedOffset, animated: false });
          }
          programmaticTarget.current = null;
          swipeStartIndex.current = null;
          const next = listCategories[nextIndex];
          if (next !== activeCategoryRef.current) changeCategory(next, false);
        }}
      >
        {listCategories.map((pageCategory) => {
          const cached = categoryCache.current.get(pageCategory);
          const visibleItems = pageCategory === category
            ? (cached ?? [])
            : sortProductCards(cached ?? [], sort).slice(0, mode === "popular" ? 4 : 5);
          const { sorted, groups } = grouped(visibleItems);
          return <View key={pageCategory} style={{ width: pageWidth, flex: 1 }}>
            <ScrollView
              ref={(node) => {
                if(node)pageScrollRefs.current.set(pageCategory,node);
                else pageScrollRefs.current.delete(pageCategory);
              }}
              contentContainerStyle={s.content}
              showsVerticalScrollIndicator={false}
            >
              {cached === undefined ? null : sorted.length === 0 ? (
                <Text style={s.empty}>상품이 없습니다.</Text>
              ) : (
                <>
                  {heroMode ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.heroRow}>
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
          </View>;
        })}
      </ScrollView>
      <Pressable
        accessibilityLabel="맨 위로"
        style={s.scrollTopButton}
        onPress={() => pageScrollRefs.current.get(category)?.scrollTo({ y: 0, animated: true })}
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
  categoryContent: { flex: 1 },
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

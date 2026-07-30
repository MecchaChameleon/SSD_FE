import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, BottomNavigation, Product, ProductCard } from "../components/home";
import { colors, fonts } from "../theme";
import { buyerApi } from "../api";
import { apiProductToCard } from "./BuyerHomeScreen";
import HeartIcon from "../../icon/heart.svg";

export function LikesScreen({ onHome, onMap, onPurchases, onMyPage, onSelectProduct }: {
  onHome: () => void;
  onMap: () => void;
  onPurchases: () => void;
  onMyPage: () => void;
  onSelectProduct: (product: Product) => void;
}) {
  const [items, setItems] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(
    () =>
      buyerApi
        .wishlist({ size: 50 })
        .then((page) => setItems(page.content.map(apiProductToCard)))
        .catch(() => setItems([]))
        .finally(() => setLoaded(true)),
    [],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const unlike = async (id: number) => {
    setItems((v) => v.filter((item) => item.id !== id));
    try {
      await buyerApi.removeWishlist(id);
    } catch {
      void refresh();
    }
  };
  return (
    <View style={s.root}>
      <AppHeader />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>좋아요</Text>
        {!loaded ? null : items.length === 0 ? (
          <View style={s.empty}>
            <HeartIcon width={40} height={40} color={colors.g300} />
            <Text style={s.emptyTitle}>찜한 상품이 없습니다.</Text>
            <Text style={s.emptyBody}>관심 있는 마감 상품과 자원을 찜해 보세요.</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {items.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                liked
                onLike={() => unlike(item.id)}
                onBuy={() => onSelectProduct(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <BottomNavigation
        active="likes"
        onSelect={(tab) =>
          tab === "home" ? onHome() : tab === "map" ? onMap() : tab === "purchases" ? onPurchases() : tab === "mypage" ? onMyPage() : undefined
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 92 },
  title: { fontSize: 20, fontFamily: fonts.semibold, fontWeight: "600", lineHeight: 24, color: colors.black, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 20 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 80 },
  emptyTitle: { fontSize: 15, fontFamily: fonts.semibold, fontWeight: "600", color: colors.g800 },
  emptyBody: { fontSize: 13, fontFamily: fonts.regular, color: colors.g500, textAlign: "center" },
});

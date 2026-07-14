import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ActionButton } from "../components/ui";
import { colors, radius } from "../theme";
import { ApiError, Product as ApiProduct, sellerApi } from "../api";
import ChevronDown from "../../icon/chevron_down.svg";
import ChevronLeft from "../../icon/chevron_left.svg";
import MoreIcon from "../../icon/more_vertical.svg";
import Character from "../../icon/로컬타임_캐릭터 1.svg";

type Product = {
  id: number;
  name: string;
  category: string;
  type: string;
  quantity: string;
  regular: string;
  minimum: string;
  start: string;
  end: string;
  startIso: string | null;
  endIso: string;
  location: string;
  status: string;
};

const businessLabel = {
  RESTAURANT: "음식점",
  LODGING: "숙박",
  EXPERIENCE: "체험",
  RENTAL_MOBILITY: "렌탈/모빌리티",
} as const;
const categoryLabel = {
  SAME_DAY_INVENTORY: "당일 재고",
  EMPTY_TIME_RESOURCE: "빈 시간대 자원",
  SAME_DAY_ROOM: "당일 공실",
  TOUR_REMAINDER: "이동/관광 잔여 상품",
} as const;
const businessTypeByLabel = {
  음식점: "RESTAURANT",
  숙박: "LODGING",
  체험: "EXPERIENCE",
  "렌탈/모빌리티": "RENTAL_MOBILITY",
} as const;
const categoryByLabel = {
  "당일 재고": "SAME_DAY_INVENTORY",
  "빈 시간대 자원": "EMPTY_TIME_RESOURCE",
  "당일 공실": "SAME_DAY_ROOM",
  "이동/관광 잔여 상품": "TOUR_REMAINDER",
} as const;
const typeOptionsByBusiness = {
  음식점: ["당일 재고", "빈 시간대 자원"],
  숙박: ["당일 공실", "빈 시간대 자원"],
  체험: ["빈 시간대 자원"],
  "렌탈/모빌리티": ["이동/관광 잔여 상품", "빈 시간대 자원"],
} as const;
const timeLabel = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("ko-KR", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
const withTime = (iso: string | null, label: string) => {
  const saved = iso ? new Date(iso) : null;
  const base = saved && saved.getTime() > Date.now() ? saved : new Date();
  const match = label.match(/(오전|오후)\s*(\d+):(\d+)/);
  if (!match) return base.toISOString();
  let hour = Number(match[2]) % 12;
  if (match[1] === "오후") hour += 12;
  base.setHours(hour, Number(match[3]), 0, 0);
  return base.toISOString();
};
const toViewProduct = (item: ApiProduct): Product => ({
  id: item.id,
  name: item.name,
  category: businessLabel[item.businessType],
  type: categoryLabel[item.category],
  quantity: String(item.qty),
  regular: String(item.price),
  minimum: String(item.minPrice),
  start: timeLabel(item.openTime),
  end: timeLabel(item.deadline),
  startIso: item.openTime,
  endIso: item.deadline,
  location: item.address ?? "",
  status:
    item.status === "ACTIVE" && new Date(item.deadline).getTime() <= Date.now()
      ? "판매종료"
      : item.status === "ACTIVE"
      ? "판매중"
      : item.status === "PAUSED"
        ? "판매중지"
        : "판매종료",
});
const statusByLabel = {
  판매중: "ACTIVE",
  판매중지: "PAUSED",
  판매종료: "CLOSED",
} as const;

export function RegisteredProductsScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Product[]>([]);
  const [menu, setMenu] = useState<number | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteError,setDeleteError]=useState<string|null>(null);
  const [sortDesc, setSortDesc] = useState(true);
  useEffect(() => {
    const refresh = () =>
      sellerApi
        .products()
        .then((page) => setItems(page.content.map(toViewProduct)))
        .catch(() => undefined);
    void refresh();
    const interval = setInterval(refresh, 5_000);
    return () => clearInterval(interval);
  }, []);
  const shown = useMemo(
    () => (sortDesc ? [...items] : [...items].reverse()),
    [items, sortDesc],
  );
  if (editing)
    return (
      <EditProduct
        product={editing}
        onBack={() => setEditing(null)}
        onSave={async (next) => {
          await sellerApi.updateProduct(next.id, {
            name: next.name,
            businessType:
              businessTypeByLabel[
                next.category as keyof typeof businessTypeByLabel
              ],
            category:
              categoryByLabel[next.type as keyof typeof categoryByLabel],
            qty: Number(next.quantity),
            price: Number(next.regular.replace(/,/g, "")),
            minPrice: Number(next.minimum.replace(/,/g, "")),
            openTime: withTime(next.startIso, next.start),
            deadline: withTime(next.endIso, next.end),
            address: next.location,
            status: statusByLabel[next.status as keyof typeof statusByLabel],
          });
          setItems((list) =>
            list.map((item) => (item.id === next.id ? next : item)),
          );
          setEditing(null);
        }}
      />
    );
  return (
    <View style={s.root}>
      <Header title="등록 상품/자원 수" onBack={onBack} />
      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {items.length ? (
          <>
            <Pressable style={s.sort} onPress={() => setSortDesc((v) => !v)}>
              <Text style={s.sortText}>
                {sortDesc ? "높은 할인율순" : "낮은 할인율순"}
              </Text>
              <ChevronDown width={18} height={18} color={colors.g500} />
            </Pressable>
            {shown.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                menu={menu === item.id}
                onMenu={() => setMenu(menu === item.id ? null : item.id)}
                onEdit={() => {
                  setMenu(null);
                  setEditing(item);
                }}
                onDelete={() => {
                  setMenu(null);
                  setDeleting(item);
                }}
              />
            ))}
          </>
        ) : (
          <Empty />
        )}
      </ScrollView>
      <DeleteDialog
        product={deleting}
        onClose={() => setDeleting(null)}
        onDelete={async () => {
          if (!deleting) return;
          try {
            await sellerApi.deleteProduct(deleting.id);
            setItems((list) => list.filter((item) => item.id !== deleting.id));
          } catch(error) {
            setDeleteError(error instanceof ApiError?error.message:"상품을 삭제할 수 없습니다.");
          } finally {
            setDeleting(null);
          }
        }}
      />
      <DeleteBlockedDialog message={deleteError} onClose={()=>setDeleteError(null)}/>
    </View>
  );
}
function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack}>
        <ChevronLeft width={24} height={24} color={colors.black} />
      </Pressable>
      <Text style={s.headerTitle}>{title}</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}
function Empty() {
  return (
    <View style={s.empty}>
      <Character width={112} height={112} />
      <Text style={s.emptyTitle}>등록된 상품/자원이 없어요.</Text>
      <Text style={s.emptyBody}>
        당일 폐기되는 상품이나 빈 객실을 등록해 보세요!
      </Text>
    </View>
  );
}
function ProductCard({
  item,
  menu,
  onMenu,
  onEdit,
  onDelete,
}: {
  item: Product;
  menu: boolean;
  onMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const discount = Math.round(
    (1 -
      Number(item.minimum.replace(/,/g, "")) /
        Number(item.regular.replace(/,/g, ""))) *
      100,
  );
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View style={s.states}>
          <Text style={s.stateLabel}>상품 상태 |</Text>
          <View style={s.stateTag}>
            <Text style={s.stateText}>{item.status}</Text>
          </View>
        </View>
        <Pressable hitSlop={8} onPress={onMenu}>
          <MoreIcon width={24} height={24} color={colors.g300} />
        </Pressable>
        {menu ? (
          <View style={s.menu}>
            <Pressable style={s.menuItem} onPress={onEdit}>
              <Text>수정</Text>
            </Pressable>
            <Pressable style={s.menuItem} onPress={onDelete}>
              <Text>삭제</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <Text style={s.cardTitle}>{item.name}</Text>
      <View style={s.dataRow}>
        <Text style={s.data}>
          <Text style={s.bold}>상품 구분</Text> {item.type}
        </Text>
        <Text style={s.data}>
          <Text style={s.bold}>판매 수량</Text> {item.quantity}개
        </Text>
      </View>
      <View style={s.dataRow}>
        <Text style={s.data}>
          <Text style={s.bold}>판매 시작 시각</Text> {item.start}
        </Text>
        <Text style={s.data}>
          <Text style={s.bold}>판매 마감 시각</Text> {item.end}
        </Text>
      </View>
      <View style={s.discountRow}>
        <Text style={s.bold}>현재 추천 할인가</Text>
        <Text style={s.price}>
          {Number(item.minimum.replace(/,/g, "")).toLocaleString()}원
        </Text>
        <Text style={s.discount}>{discount}% 할인</Text>
      </View>
    </View>
  );
}

function DeleteBlockedDialog({message,onClose}:{message:string|null;onClose:()=>void}){if(!message)return null;return <Modal transparent visible animationType="fade" onRequestClose={onClose}><View style={s.overlay}><View style={s.dialog}><Text style={s.dialogTitle}>ⓘ 상품을 삭제할 수 없습니다.</Text><Text style={s.dialogBody}>현재 이 상품에 대기 중이거나 확정된 예약이 있습니다.{`\n`}주문 관리 화면에서 승인 또는 거절을 먼저 처리하신 후 삭제해 주세요.</Text><Pressable style={[s.dialogButton,s.delete,{flex:0}]} onPress={onClose}><Text style={s.buttonText}>확인</Text></Pressable></View></View></Modal>}

function DeleteDialog({
  product,
  onClose,
  onDelete,
}: {
  product: Product | null;
  onClose: () => void;
  onDelete: () => void;
}) {
  if (!product) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.dialog}>
          <Text style={s.dialogTitle}>
            ⓘ 이 상품을 정말 삭제하시겠습니까?
          </Text>
          <Text style={s.dialogBody}>
            삭제하시면 홈 화면과 지도에서 상품이 즉시 사라지며,{"\n"}
            근처 관광객들이 더 이상 할인 상품을 볼 수 없습니다.
          </Text>
          <View style={s.dialogButtons}>
            <Pressable style={[s.dialogButton, s.cancel]} onPress={onClose}>
              <Text style={s.buttonText}>취소</Text>
            </Pressable>
            <Pressable style={[s.dialogButton, s.delete]} onPress={onDelete}>
              <Text style={s.buttonText}>삭제</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EditProduct({
  product,
  onBack,
  onSave,
}: {
  product: Product;
  onBack: () => void;
  onSave: (p: Product) => void | Promise<void>;
}) {
  const [value, setValue] = useState(product);
  const [sheet, setSheet] = useState<
    "category" | "type" | "start" | "end" | "location" | "status" | null
  >(null);
  const [locations, setLocations] = useState<string[]>(
    product.location ? [product.location] : [],
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    sellerApi
      .profile()
      .then((profile) => {
        const next = [product.location, profile.address].filter(
          (x, index, list): x is string => !!x && list.indexOf(x) === index,
        );
        setLocations(next);
      })
      .catch(() => undefined);
  }, [product.location]);
  const set = (key: keyof Product, text: string) =>
    setValue((v) => ({ ...v, [key]: text }));
  const changed = JSON.stringify(value) !== JSON.stringify(product);
  const valid = !!(
    value.name.trim() &&
    value.category &&
    value.type &&
    value.quantity &&
    value.regular &&
    value.minimum &&
    value.start &&
    value.end &&
    value.location &&
    value.status
  );
  const save = async () => {
    if (!changed || !valid || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(Number(value.quantity) <= 0 ? { ...value, status: "판매중지" } : value);
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : "상품 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={s.root}>
      <Header title="등록 상품/자원 수정" onBack={onBack} />
      <ScrollView contentContainerStyle={s.form} showsVerticalScrollIndicator={false}>
        <Field label="상품/자원 이름">
          <TextInput
            style={s.input}
            value={value.name}
            onChangeText={(v) => set("name", v)}
          />
        </Field>
        <Field label="상품/자원 카테고리 및 유형">
          <Select value={value.category} onPress={() => setSheet("category")} />
          <Select value={value.type} onPress={() => setSheet("type")} />
        </Field>
        <Field label="등록 수량">
          <TextInput
            style={s.input}
            keyboardType="number-pad"
            value={value.quantity}
            onChangeText={(v) => set("quantity", v.replace(/\D/g, ""))}
          />
        </Field>
        <Field label="정가/원가">
          <MoneyInput
            value={value.regular}
            onChange={(v) => set("regular", v)}
          />
        </Field>
        <Field label="최소 판매가">
          <MoneyInput
            value={value.minimum}
            onChange={(v) => set("minimum", v)}
          />
        </Field>
        <View style={s.two}>
          <View style={s.half}>
            <Field label="판매 시작 시각">
              <Select value={value.start} onPress={() => setSheet("start")} />
            </Field>
          </View>
          <View style={s.half}>
            <Field label="판매 마감 시각">
              <Select value={value.end} onPress={() => setSheet("end")} />
            </Field>
          </View>
        </View>
        <Field label="매장 위치">
          <Select value={value.location} onPress={() => setSheet("location")} />
        </Field>
        <Field label="판매 상태">
          <Select value={value.status} onPress={() => setSheet("status")} />
        </Field>
        {saveError ? <Text style={s.saveError}>{saveError}</Text> : null}
        <View style={s.formButtons}>
          <Pressable style={[s.formButton, s.cancel]} onPress={onBack}>
            <Text style={s.buttonText}>취소</Text>
          </Pressable>
          <Pressable
            disabled={!changed || !valid || saving}
            style={[
              s.formButton,
              changed && valid && !saving ? s.delete : s.disabled,
            ]}
            onPress={save}
          >
            <Text style={s.buttonText}>{saving ? "저장 중..." : "저장"}</Text>
          </Pressable>
        </View>
      </ScrollView>
      <TimeWheel
        visible={sheet === "start" || sheet === "end"}
        value={sheet === "start" ? value.start : value.end}
        title={sheet === "start" ? "판매 시작 시각" : "판매 마감 시각"}
        onClose={() => setSheet(null)}
        onApply={(time) => {
          if (sheet === "start") set("start", time);
          if (sheet === "end") set("end", time);
          setSheet(null);
        }}
      />
      <OptionSheet
        visible={sheet === "category"}
        title="카테고리 선택"
        options={Object.keys(typeOptionsByBusiness)}
        selected={value.category}
        onClose={() => setSheet(null)}
        onSelect={(category) => {
          const options=typeOptionsByBusiness[category as keyof typeof typeOptionsByBusiness];
          setValue(current=>({...current,category,type:options.includes(current.type as never)?current.type:options[0]}));
          setSheet(null);
        }}
      />
      <OptionSheet
        visible={sheet === "type"}
        title="유형 선택"
        options={[...typeOptionsByBusiness[value.category as keyof typeof typeOptionsByBusiness]]}
        selected={value.type}
        onClose={() => setSheet(null)}
        onSelect={(type) => {
          set("type", type);
          setSheet(null);
        }}
      />
      <OptionSheet
        visible={sheet === "location"}
        title="매장 위치 선택"
        options={locations}
        selected={value.location}
        onClose={() => setSheet(null)}
        onSelect={(location) => {
          set("location", location);
          setSheet(null);
        }}
      />
      <OptionSheet
        visible={sheet === "status"}
        title="판매 상태 선택"
        options={["판매중", "판매중지", "판매종료"]}
        selected={value.status}
        onClose={() => setSheet(null)}
        onSelect={(status) => {
          set("status", status);
          setSheet(null);
        }}
      />
    </View>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        <Text style={s.required}> *</Text>
      </Text>
      {children}
    </View>
  );
}
function Select({ value, onPress }: { value: string; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={s.select}>
      <Text numberOfLines={1} style={{ flex: 1 }}>
        {value}
      </Text>
      <ChevronDown
        width={24}
        height={24}
        color={onPress ? colors.g500 : colors.g300}
      />
    </Pressable>
  );
}
function parseTime(value: string) {
  const match = value.match(/(오전|오후)\s*(\d+):(\d+)/);
  if (!match) {
    const now = new Date();
    now.setMinutes(Math.round(now.getMinutes() / 5) * 5, 0, 0);
    return { period: now.getHours() < 12 ? "오전" : "오후", hour: String(now.getHours() % 12 || 12), minute: String(now.getMinutes()).padStart(2, "0") };
  }
  return {
    period: match[1],
    hour: match[2],
    minute: String(Math.min(55, Math.round(Number(match[3]) / 5) * 5)).padStart(
      2,
      "0",
    ),
  };
}
export function TimeWheel({
  visible,
  value,
  title,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: string;
  title: string;
  onClose: () => void;
  onApply: (value: string) => void;
}) {
  const initial = parseTime(value);
  const [period, setPeriod] = useState(initial.period);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [interacted, setInteracted] = useState({period:false,hour:false,minute:false});
  useEffect(() => {
    if (visible) {
      const next = parseTime(value);
      setPeriod(next.period);
      setHour(next.hour);
      setMinute(next.minute);
      setInteracted({period:false,hour:false,minute:false});
    }
  }, [visible, value]);
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={s.pickerOverlay} onPress={onClose}>
        <Pressable style={s.pickerSheet} onPress={event => event.stopPropagation()}>
          <View style={s.pickerHandle} />
          <Text style={s.pickerTitle}>{title}</Text>
          <View style={s.wheels}>
            <View style={s.wheelHighlight} />
            <Wheel
              values={["오전", "오후"]}
              selected={period}
              onSelect={setPeriod}
              emphasize={interacted.period}
              onInteract={()=>setInteracted(value=>({...value,period:true}))}
            />
            <Wheel
              values={Array.from({ length: 12 }, (_, i) => String(i + 1))}
              selected={hour}
              onSelect={setHour}
              emphasize={interacted.hour}
              onInteract={()=>setInteracted(value=>({...value,hour:true}))}
            />
            <Text style={s.timeUnit}>시</Text>
            <Wheel
              values={Array.from({ length: 12 }, (_, i) =>
                String(i * 5).padStart(2, "0"),
              )}
              selected={minute}
              onSelect={setMinute}
              emphasize={interacted.minute}
              onInteract={()=>setInteracted(value=>({...value,minute:true}))}
            />
            <Text style={s.timeUnit}>분</Text>
          </View>
          <Pressable
            style={s.pickerApply}
            onPress={event => {event.stopPropagation();onApply(`${period} ${hour}:${minute}`);}}
          >
            <Text style={s.buttonText}>선택 완료</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
function Wheel({
  values,
  selected,
  onSelect,
  emphasize,
  onInteract,
}: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  emphasize: boolean;
  onInteract: () => void;
}) {
  const itemHeight = 44;
  const ref = useRef<ScrollView>(null);
  const index = Math.max(0, values.indexOf(selected));
  const lastOffset = useRef(index * itemHeight);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectOffset = (offset: number, animated: boolean) => {
    const next = Math.max(
      0,
      Math.min(values.length - 1, Math.round(offset / itemHeight)),
    );
    const snappedOffset = next * itemHeight;
    lastOffset.current = snappedOffset;
    if (values[next] !== selected) onSelect(values[next]);
    if (Math.abs(offset - snappedOffset) > 0.5) {
      ref.current?.scrollTo({ y: snappedOffset, animated });
    }
  };

  useEffect(() => {
    const offset = index * itemHeight;
    lastOffset.current = offset;
    const timer = setTimeout(() => {
      ref.current?.scrollTo({ y: offset, animated: false });
    }, 0);
    return () => {
      clearTimeout(timer);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [index, itemHeight]);

  const finish = (event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    lastOffset.current = offset;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    selectOffset(offset, true);
  };
  return (
    <ScrollView
      ref={ref}
      key={values.join("-")}
      style={s.wheel}
      contentContainerStyle={s.wheelContent}
      showsVerticalScrollIndicator={false}
      snapToOffsets={values.map((_,itemIndex)=>itemIndex*itemHeight)}
      snapToAlignment="start"
      disableIntervalMomentum
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScrollBeginDrag={() => {
        if (settleTimer.current) clearTimeout(settleTimer.current);
        onInteract();
      }}
      onScroll={event => {
        const offset = event.nativeEvent.contentOffset.y;
        lastOffset.current = offset;
        if (settleTimer.current) clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(() => selectOffset(lastOffset.current, true), 80);
      }}
      onScrollEndDrag={event => {
        const velocity = event.nativeEvent.velocity?.y ?? 0;
        if (Math.abs(velocity) < 0.01) finish(event);
      }}
      onMomentumScrollEnd={finish}
    >
      {values.map((item) => (
        <View key={item} style={s.wheelItem}>
          <Text style={[s.wheelText, emphasize && item === selected && s.wheelSelected]}>
            {item}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
function OptionSheet({
  visible,
  title,
  options,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={s.pickerOverlay} onPress={onClose}>
        <Pressable style={s.optionSheet} onPress={() => undefined}>
          <View style={s.pickerHandle} />
          <Text style={s.pickerTitle}>{title}</Text>
          {options.length ? (
            options.map((option) => (
              <Pressable
                key={option}
                style={s.optionRow}
                onPress={() => onSelect(option)}
              >
                <Text
                  style={[
                    s.optionText,
                    option === selected && s.optionSelected,
                  ]}
                >
                  {option}
                </Text>
                <View
                  style={[
                    s.optionRadio,
                    option === selected && s.optionRadioOn,
                  ]}
                >
                  {option === selected ? <View style={s.optionDot} /> : null}
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={s.noOption}>
              사업자 정보에 등록된 매장 주소가 없습니다.
            </Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
function MoneyInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.money}>
      <TextInput
        style={[s.input, { flex: 1 }]}
        keyboardType="number-pad"
        value={value}
        onChangeText={(v) => onChange(v.replace(/[^0-9,]/g, ""))}
      />
      <Text>원</Text>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  list: { padding: 16, paddingBottom: 40 },
  sort: {
    height: 24,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sortText: { fontSize: 12, color: colors.g500 },
  empty: { paddingTop: 200, alignItems: "center", gap: 7 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.g600 },
  emptyBody: { fontSize: 12, color: colors.g500 },
  card: {
    borderWidth: 1,
    borderColor: colors.g300,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  cardHead: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
  },
  states: { flexDirection: "row", alignItems: "center", gap: 6 },
  stateLabel: { fontSize: 14, fontWeight: "600", color: colors.g300 },
  stateTag: {
    backgroundColor: colors.g300,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stateText: { fontSize: 12, fontWeight: "600", color: colors.white },
  reserveTag: {
    backgroundColor: colors.primary500,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reserveText: { fontSize: 12, fontWeight: "600", color: colors.white },
  menu: {
    position: "absolute",
    right: 4,
    top: 28,
    width: 92,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 8,
    backgroundColor: colors.white,
    zIndex: 10,
    elevation: 8,
  },
  menuItem: {
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
  },
  cardTitle: { fontSize: 20, fontWeight: "600" },
  dataRow: { flexDirection: "row" },
  data: { flex: 1, fontSize: 12, color: colors.g600 },
  bold: { fontWeight: "600", color: colors.black },
  discountRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  price: { fontSize: 18, fontWeight: "600", color: colors.primary500 },
  discount: { fontSize: 14, fontWeight: "600", color: colors.info },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.25)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  dialog: {
    width: "100%",
    maxWidth: 370,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    gap: 20,
  },
  dialogTitle: { fontSize: 18, fontWeight: "600" },
  dialogBody: { fontSize: 12, lineHeight: 17, color: colors.g600 },
  dialogButtons: { flexDirection: "row", gap: 8 },
  dialogButton: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: { backgroundColor: colors.g300 },
  delete: { backgroundColor: colors.primary500 },
  buttonText: { fontSize: 16, fontWeight: "600", color: colors.white },
  form: { padding: 16, paddingBottom: 40, gap: 24 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "500" },
  required: { color: colors.primary500 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.g300,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  select: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.g300,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  money: { flexDirection: "row", alignItems: "center", gap: 10 },
  two: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  formButtons: { flexDirection: "row", gap: 14, marginTop: 8 },
  formButton: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { backgroundColor: colors.g200 },
  saveError:{fontSize:12,lineHeight:18,color:colors.danger,textAlign:"center"},
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.25)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  pickerSheet: {
    width: "100%",
    maxWidth: 402,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingTop: 12,
  },
  optionSheet: {
    width: "100%",
    maxWidth: 402,
    minHeight: 260,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingTop: 12,
  },
  pickerHandle: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.g200,
    alignSelf: "center",
    marginBottom: 20,
  },
  pickerTitle: { fontSize: 18, fontWeight: "600", marginBottom: 20 },
  wheels: {
    height: 220,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  wheelHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 88,
    height: 44,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.g200,
    backgroundColor: "rgba(243,171,36,.08)",
  },
  wheel: { flex: 1, height: 220, zIndex: 1 },
  wheelContent: { paddingVertical: 88 },
  wheelItem: { height: 44, alignItems: "center", justifyContent: "center" },
  wheelText: { fontSize: 16, color: colors.g300 },
  wheelSelected: { fontSize: 18, fontWeight: "600", color: colors.black },
  timeUnit: { fontSize: 14, color: colors.g500, zIndex: 2 },
  pickerApply: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary500,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  optionRow: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionText: { fontSize: 16, color: colors.g800 },
  optionSelected: { fontWeight: "600", color: colors.primary500 },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.g300,
    alignItems: "center",
    justifyContent: "center",
  },
  optionRadioOn: { borderColor: colors.primary500 },
  optionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary500,
  },
  noOption: {
    fontSize: 14,
    color: colors.g500,
    textAlign: "center",
    paddingVertical: 40,
  },
});

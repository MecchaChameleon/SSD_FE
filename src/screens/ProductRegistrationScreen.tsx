import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius } from '../theme';
import { ApiError, sellerApi } from '../api';
import ChevronDown from '../../icon/chevron_down.svg';
import CloseIcon from '../../icon/x.svg';
import Character from '../../icon/로컬타임_캐릭터 1.svg';
import { TimeWheel } from './RegisteredProductsScreen';
import { AppHeader } from '../components/home';
import { normalizePickedImages } from '../utils/normalizePickedImage';

type Category = '음식점' | '숙박' | '체험' | '렌탈/모빌리티';
type Sheet = 'category' | 'type' | 'start' | 'end' | 'location' | null;

const TOTAL_STEPS = 8;

const categoryTypes: Record<Category, string[]> = {
  음식점: ['당일 재고', '빈 시간대 자원'],
  숙박: ['당일 공실'],
  체험: ['빈 시간대 자원'],
  '렌탈/모빌리티': ['이동/관광 잔여 상품'],
};
const productTypeConfig = {
  음식점: { businessType: 'RESTAURANT', types: { '당일 재고': 'SAME_DAY_INVENTORY', '빈 시간대 자원': 'EMPTY_TIME_RESOURCE' } },
  숙박: { businessType: 'LODGING', types: { '당일 공실': 'SAME_DAY_ROOM' } },
  체험: { businessType: 'EXPERIENCE', types: { '빈 시간대 자원': 'EMPTY_TIME_RESOURCE' } },
  '렌탈/모빌리티': { businessType: 'RENTAL_MOBILITY', types: { '이동/관광 잔여 상품': 'TOUR_REMAINDER' } },
} as const;

function timeToIso(value: string) {
  const match = value.match(/(오전|오후)\s*(\d+):(\d+)/);
  let hour = Number(match?.[2] ?? 0) % 12;
  if (match?.[1] === '오후') hour += 12;
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const minute = Number(match?.[3] ?? 0);
  return new Date(`${date}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00+09:00`).toISOString();
}
function timeMinutes(value: string) {
  const match = value.match(/(오전|오후)\s*(\d+):(\d+)/);
  if (!match) return -1;
  let hour = Number(match[2]) % 12;
  if (match[1] === '오후') hour += 12;
  return hour * 60 + Number(match[3]);
}

/** 새 섹션이 쌓일 때 fade-in + slide-up 애니메이션 */
function FadeInSection({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export function ProductRegistrationScreen({
  onBack, onCreated, onGoToAI, showHeader = true,
}: {
  onBack: () => void;
  onCreated?: () => void;
  onGoToAI?: () => void;
  showHeader?: boolean;
}) {
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [type, setType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [regular, setRegular] = useState('');
  const [minimum, setMinimum] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    sellerApi.profile().then(profile => {
      if (profile.address) { setLocations([profile.address]); setLocation(profile.address); }
    }).catch(() => setRequestError('사업자 정보의 매장 주소를 불러오지 못했습니다.'));
  }, []);

  /** 진행 게이지 애니메이션 */
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step - 1) / TOTAL_STEPS,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  /** 새 단계 노출 시 스크롤 하단으로 이동 */
  useEffect(() => {
    if (step > 1) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const invalidPriceRange = !!(regular && minimum && Number(minimum) > Number(regular));
  const invalidTimeRange = !!(start && end && timeMinutes(start) >= timeMinutes(end));
  const types = useMemo(() => category ? categoryTypes[category] : [], [category]);
  const digits = (value: string, setter: (v: string) => void) => setter(value.replace(/\D/g, ''));

  const stepValid = (s: number): boolean => {
    switch (s) {
      case 1: return images.length >= 1;
      case 2: return name.trim().length > 0;
      case 3: return category !== null && type !== '';
      case 4: return quantity !== '';
      case 5: return regular !== '' && minimum !== '' && !invalidPriceRange;
      case 6: return description.trim().length > 0;
      case 7: return start !== '' && end !== '' && !invalidTimeRange;
      case 8: return location !== '';
      default: return false;
    }
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setRequestError('사진 등록을 위해 사진 보관함 접근 권한을 허용해 주세요.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3 - images.length,
      quality: 0.85,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (!result.canceled) {
      try {
        const normalized = await normalizePickedImages(result.assets);
        setImages(current => [...current, ...normalized].slice(0, 3));
      } catch {
        setRequestError('선택한 사진을 JPEG 형식으로 변환하지 못했습니다. 다른 사진을 선택해 주세요.');
      }
    }
  };

  const handleNext = () => {
    if (!stepValid(step)) { setStepError(true); return; }
    setStepError(false);
    setStep(s => s + 1);
  };

  const submit = async () => {
    if (!stepValid(8) || !category) { setStepError(true); return; }
    const config = productTypeConfig[category];
    const productCategory = config.types[type as keyof typeof config.types];
    if (!productCategory) return;
    setSaving(true);
    setRequestError(null);
    try {
      const product = await sellerApi.createProduct({
        name: name.trim(),
        description: description.trim(),
        businessType: config.businessType,
        category: productCategory,
        qty: Number(quantity),
        price: Number(regular),
        minPrice: Number(minimum),
        openTime: timeToIso(start),
        deadline: timeToIso(end),
        address: location,
      });
      try {
        await sellerApi.uploadProductImages(product.id, images.map((image, index) => ({
          uri: image.uri,
          name: image.fileName ?? `product-${index + 1}.jpg`,
          type: image.mimeType ?? 'image/jpeg',
          file: image.file,
        })));
      } catch (uploadError) {
        await sellerApi.deleteProduct(product.id).catch(() => undefined);
        throw uploadError;
      }
      onCreated?.();
      setComplete(true);
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : '상품 등록 요청에 실패했습니다. 잠시 후 다시 시도해주세요.';
      if (/최소|최고|금액|가격/.test(message)) setPriceError(message);
      else if (/시작.*(종료|마감)|종료.*시작|시간/.test(message)) setTimeError(message);
      else setRequestError(message);
    } finally { setSaving(false); }
  };

  if (complete) return (
    <Completion
      onGoToAI={onGoToAI ?? onBack}
      onGoHome={onBack}
    />
  );

  const isLastStep = step === TOTAL_STEPS;
  const canProceed = stepValid(step);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={s.root}>
      {showHeader ? <Header /> : null}

      {/* 상단 고정: 제목 + 진행 게이지 바 */}
      <View style={s.titleBar}>
        <Text style={s.title}>신규 상품/자원 등록하기</Text>
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: progressWidth as any }]} />
        </View>
      </View>

      {/* 누적 스크롤 콘텐츠 */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.form}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step 8 — 매장 위치 (새 단계가 위에 나타남) */}
        {step >= 8 && (
          <FadeInSection>
            <View style={s.stepSection}>
              <View style={s.field}>
                <Text style={s.label}>매장 위치<Text style={s.required}> *</Text></Text>
                <Select value={location} placeholder="매장 선택" onPress={() => setSheet('location')} error={stepError && step === 8 && !location} />
                {stepError && step === 8 && !location ? <Text style={s.errorText}>상품/자원을 등록할 매장을 선택해주세요.</Text> : null}
              </View>
              {requestError ? <Text style={s.requestError}>{requestError}</Text> : null}
            </View>
          </FadeInSection>
        )}

        {/* Step 7 — 판매 시각 */}
        {step >= 7 && (
          <FadeInSection>
            <View style={s.stepSection}>
              <View style={s.timeRow}>
                <View style={s.timeCell}>
                  <View style={s.field}>
                    <Text style={s.label}>판매 시작 시각<Text style={s.required}> *</Text></Text>
                    <Select value={start} placeholder="시각 선택" onPress={() => setSheet('start')} error={stepError && step === 7 && !start} />
                  </View>
                </View>
                <View style={s.timeCell}>
                  <View style={s.field}>
                    <Text style={s.label}>판매 마감 시각<Text style={s.required}> *</Text></Text>
                    <Select value={end} placeholder="시각 선택" onPress={() => setSheet('end')} error={stepError && step === 7 && !end} />
                  </View>
                </View>
              </View>
              {timeError ? <Text style={s.timeRangeError}>{timeError}</Text> : null}
              {stepError && step === 7 && (!start || !end) ? (
                <Text style={s.timeRangeError}>판매 시작 시각과 마감 시각을 모두 선택해주세요.</Text>
              ) : stepError && step === 7 && invalidTimeRange ? (
                <Text style={s.timeRangeError}>판매 시작 시각은 판매 마감 시각보다 빨라야 합니다.</Text>
              ) : null}
            </View>
          </FadeInSection>
        )}

        {/* Step 6 — 상품 설명 */}
        {step >= 6 && (
          <FadeInSection>
            <View style={s.stepSection}>
              <View style={s.field}>
                <Text style={s.label}>상품 설명<Text style={s.required}> *</Text></Text>
                <View style={[s.descriptionBox, stepError && step === 6 && !description.trim() ? s.inputError : null]}>
                  <TextInput
                    multiline
                    maxLength={50}
                    value={description}
                    onChangeText={v => { setDescription(v); if (step === 6) setStepError(false); }}
                    placeholder="상품의 특징이나 이용 방법을 입력해주세요."
                    placeholderTextColor={colors.g400}
                    style={s.descriptionInput}
                    autoFocus={step === 6}
                  />
                  <Text style={s.characterCount}>{description.length}/50</Text>
                </View>
                {stepError && step === 6 && !description.trim() ? <Text style={s.errorText}>상품 설명을 입력해주세요.</Text> : null}
              </View>
            </View>
          </FadeInSection>
        )}

        {/* Step 5 — 정가/원가 + 최소 판매가 */}
        {step >= 5 && (
          <FadeInSection>
            <View style={s.stepSection}>
              <View style={s.timeRow}>
                <View style={s.timeCell}>
                  <View style={s.field}>
                    <Text style={s.label}>정가/원가<Text style={s.required}> *</Text></Text>
                    <MoneyInput value={regular} onChange={v => { digits(v, setRegular); setPriceError(null); if (step === 5) setStepError(false); }} error={(stepError && step === 5 && !regular) || invalidPriceRange} />
                    {stepError && step === 5 && !regular ? <Text style={s.errorText}>정가/원가를 입력해주세요.</Text> : null}
                  </View>
                </View>
                <View style={s.timeCell}>
                  <View style={s.field}>
                    <Text style={s.label}>최소 판매가<Text style={s.required}> *</Text></Text>
                    <MoneyInput value={minimum} onChange={v => { digits(v, setMinimum); setPriceError(null); if (step === 5) setStepError(false); }} error={(stepError && step === 5 && !minimum) || invalidPriceRange} />
                    {stepError && step === 5 && !minimum ? <Text style={s.errorText}>최소 판매가를 입력해주세요.</Text> : null}
                  </View>
                </View>
              </View>
              {(priceError ?? (stepError && step === 5 && invalidPriceRange ? '최소 판매가는 정가/원가보다 높을 수 없습니다.' : null)) ? (
                <Text style={s.timeRangeError}>{priceError ?? '최소 판매가는 정가/원가보다 높을 수 없습니다.'}</Text>
              ) : null}
            </View>
          </FadeInSection>
        )}

        {/* Step 4 — 등록 수량 */}
        {step >= 4 && (
          <FadeInSection>
            <View style={s.stepSection}>
              <View style={s.field}>
                <Text style={s.label}>등록 수량<Text style={s.required}> *</Text></Text>
                <TextInput
                  value={quantity}
                  onChangeText={v => { digits(v, setQuantity); if (step === 4) setStepError(false); }}
                  keyboardType="number-pad"
                  placeholder="수량 입력"
                  placeholderTextColor={colors.g400}
                  style={[s.input, stepError && step === 4 && !quantity ? s.inputError : null]}
                  autoFocus={step === 4}
                />
                {stepError && step === 4 && !quantity ? <Text style={s.errorText}>등록 수량을 입력해주세요.</Text> : null}
              </View>
            </View>
          </FadeInSection>
        )}

        {/* Step 3 — 카테고리 + 유형 */}
        {step >= 3 && (
          <FadeInSection>
            <View style={s.stepSection}>
              <View style={s.field}>
                <Text style={s.label}>상품/자원 카테고리 및 유형<Text style={s.required}> *</Text></Text>
                <Select value={category ?? ''} placeholder="카테고리 선택" onPress={() => setSheet('category')} error={stepError && step === 3 && !category} />
                <Select value={type} placeholder="유형 선택" onPress={() => { if (category) setSheet('type'); }} disabled={!category} error={stepError && step === 3 && !!category && !type} />
                {stepError && step === 3 && (!category || !type) ? <Text style={s.errorText}>카테고리와 유형을 모두 선택해주세요.</Text> : null}
              </View>
            </View>
          </FadeInSection>
        )}

        {/* Step 2 — 상품/자원 이름 */}
        {step >= 2 && (
          <FadeInSection>
            <View style={s.stepSection}>
              <View style={s.field}>
                <Text style={s.label}>상품/자원 이름<Text style={s.required}> *</Text></Text>
                <TextInput
                  value={name}
                  onChangeText={v => { setName(v); if (step === 2) setStepError(false); }}
                  placeholder="예시: 카페 창가 빈 좌석 2인"
                  placeholderTextColor={colors.g400}
                  style={[s.input, stepError && step === 2 && !name.trim() ? s.inputError : null]}
                  autoFocus={step === 2}
                />
                {stepError && step === 2 && !name.trim() ? <Text style={s.errorText}>상품/자원 이름을 입력해주세요.</Text> : null}
              </View>
            </View>
          </FadeInSection>
        )}

        {/* Step 1 — 사진 등록 (항상 표시, 맨 아래) */}
        <View style={s.stepSection}>
          <View style={s.photoField}>
            <View style={s.photoHead}>
              <Text style={s.label}>사진 등록<Text style={s.required}> *</Text></Text>
              <Text style={s.photoHint}>첫 번째로 등록된 이미지가 대표 썸네일로 자동 지정되며, 최대 3장까지 등록 가능합니다.</Text>
            </View>
            {images.length === 0 ? (
              <Pressable accessibilityLabel="상품 사진 추가" onPress={pickImages} style={s.addCircle}>
                <Text style={s.plus}>＋</Text>
              </Pressable>
            ) : (
              <View style={s.photos}>
                {images.map((image, index) => (
                  <View key={`${image.uri}-${index}`} style={[s.photo, index === 0 && s.coverPhoto]}>
                    <Image source={{ uri: image.uri }} style={s.photoImage} />
                    <Pressable accessibilityLabel={`${index + 1}번째 사진 삭제`} hitSlop={6} onPress={() => setImages(current => current.filter((_, i) => i !== index))} style={s.removePhoto}>
                      <Text style={s.removeText}>×</Text>
                    </Pressable>
                  </View>
                ))}
                {images.length < 3 ? (
                  <Pressable accessibilityLabel="상품 사진 추가" onPress={pickImages} style={[s.photo, s.photoAdd]}>
                    <Text style={s.plus}>＋</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
            {stepError && step === 1 && !images.length ? <Text style={s.errorText}>상품 사진을 1장 이상 등록해 주세요.</Text> : null}
          </View>
        </View>

      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View style={s.bottomBar}>
        <Pressable
          disabled={isLastStep && saving}
          onPress={isLastStep ? submit : handleNext}
          style={[s.bottomBtn, !canProceed ? s.bottomBtnDisabled : null]}
        >
          <Text style={[s.bottomBtnText, !canProceed ? s.bottomBtnTextDisabled : null]}>
            {isLastStep ? (saving ? '등록 중...' : '등록하기') : '다음'}
          </Text>
        </Pressable>
      </View>

      <ChoiceSheet
        kind={sheet === 'start' || sheet === 'end' ? null : sheet}
        options={sheet === 'category' ? Object.keys(categoryTypes) : sheet === 'type' ? types : sheet === 'location' ? locations : []}
        disabledOptions={
          sheet === 'category' ? ['숙박', '체험', '렌탈/모빌리티'] :
          sheet === 'type' ? ['빈 시간대 자원', '당일 공실', '이동/관광 잔여 상품'] :
          []
        }
        selected={sheet === 'category' ? (category ?? '') : sheet === 'type' ? type : sheet === 'location' ? location : ''}
        onClose={() => setSheet(null)}
        onSelect={value => {
          if (sheet === 'category') { setCategory(value as Category); setType(''); if (step === 3) setStepError(false); }
          if (sheet === 'type') { setType(value); if (step === 3) setStepError(false); }
          if (sheet === 'location') { setLocation(value); if (step === 8) setStepError(false); }
          setSheet(null);
        }}
      />
      <TimeWheel
        visible={sheet === 'start' || sheet === 'end'}
        value={sheet === 'start' ? start : end}
        title={sheet === 'start' ? '판매 시작 시각' : '판매 마감 시각'}
        onClose={() => setSheet(null)}
        onApply={value => {
          if (sheet === 'start') { setStart(value); setTimeError(null); if (step === 7) setStepError(false); }
          if (sheet === 'end') { setEnd(value); setTimeError(null); if (step === 7) setStepError(false); }
          setSheet(null);
        }}
      />
    </View>
  );
}

function Header() { return <AppHeader role="seller" />; }

function Select({ value, placeholder, onPress, disabled, error }: { value: string; placeholder: string; onPress: () => void; disabled?: boolean; error?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[s.select, disabled && s.selectDisabled, error && s.inputError]}>
      <Text style={[s.selectText, !value && s.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
      <ChevronDown width={22} height={22} color={disabled ? colors.g200 : colors.g400} />
    </Pressable>
  );
}

function MoneyInput({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: boolean }) {
  return (
    <View style={s.money}>
      <TextInput
        value={value ? Number(value).toLocaleString() : ''}
        onChangeText={onChange}
        keyboardType="number-pad"
        placeholder="금액 입력"
        placeholderTextColor={colors.g400}
        style={[s.input, s.moneyInput, { paddingRight: 14 }, error && s.inputError]}
      />
    </View>
  );
}

function ChoiceSheet({ kind, options, selected, onClose, onSelect, disabledOptions = [] }: { kind: Sheet; options: string[]; selected: string; onClose: () => void; onSelect: (value: string) => void; disabledOptions?: string[] }) {
  const titles: Record<Exclude<Sheet, null>, string> = { category: '카테고리 선택', type: '유형 선택', start: '판매 시작 시각 선택', end: '판매 마감 시각 선택', location: '상품/자원을 등록할 매장 선택' };
  if (!kind) return null;
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.sheetHead}>
            <View>
              <Text style={s.sheetTitle}>{titles[kind]}</Text>
              {kind === 'location' ? <Text style={s.sheetHint}>사업자 정보에 등록했던 매장이에요.</Text> : null}
            </View>
            <Pressable hitSlop={8} onPress={onClose}><CloseIcon width={24} height={24} color={colors.g500} /></Pressable>
          </View>
          <ScrollView style={s.options}>
            {options.map(option => {
              const isDisabled = disabledOptions.includes(option);
              return (
                <Pressable key={option} style={s.option} onPress={() => !isDisabled && onSelect(option)} disabled={isDisabled}>
                  <Text style={[s.optionText, selected === option && s.optionSelected, isDisabled && s.optionDisabled]}>
                    {option}
                    {isDisabled ? <Text style={s.optionComingSoon}>  준비 중</Text> : null}
                  </Text>
                  <View style={[s.radio, selected === option && s.radioOn, isDisabled && s.radioDisabled]}>
                    {selected === option ? <View style={s.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Completion({ onGoToAI, onGoHome }: { onGoToAI: () => void; onGoHome: () => void }) {
  return (
    <View style={s.complete}>
      <View style={s.completeBody}>
        <Character width={108} height={108} />
        <Text style={s.completeTitle}>상품 등록 완료!</Text>
        <Text style={s.completeText}>AI 추천가를 확인하고, 매장 운영의 효율성을 극대화해보세요.</Text>
      </View>
      <View style={s.completeActions}>
        <Pressable style={s.bottomBtn} onPress={onGoToAI}>
          <Text style={s.bottomBtnText}>AI 추천 할인가 확인하기</Text>
        </Pressable>
        <Pressable style={[s.bottomBtn, s.btnSecondary]} onPress={onGoHome}>
          <Text style={[s.bottomBtnText, s.btnSecondaryText]}>홈 화면으로 이동</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  titleBar: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: colors.white },
  title: { fontSize: 20, fontWeight: '600', color: colors.black, marginBottom: 12 },
  progressTrack: { height: 3, backgroundColor: colors.g200, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: colors.primary500, borderRadius: 2 },
  form: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 160 },
  stepSection: { marginBottom: 24 },
  bottomBar: { position: 'absolute', bottom: 82, left: 16, right: 16 },
  bottomBtn: { height: 56, borderRadius: radius.md, backgroundColor: colors.primary500, alignItems: 'center', justifyContent: 'center' },
  bottomBtnDisabled: { backgroundColor: colors.g200 },
  bottomBtnText: { fontSize: 16, fontWeight: '600', color: colors.white },
  bottomBtnTextDisabled: { color: colors.g400 },
  btnSecondary: { backgroundColor: colors.g200, marginTop: 12 },
  btnSecondaryText: { color: colors.g600 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500', color: colors.black },
  required: { color: colors.primary500 },
  input: { height: 52, borderWidth: 1, borderColor: colors.g300, borderRadius: radius.sm, paddingHorizontal: 14, fontSize: 16, color: colors.black, backgroundColor: colors.white },
  inputError: { borderColor: colors.danger },
  errorText: { fontSize: 12, color: colors.danger },
  photoField: { gap: 16, alignItems: 'center' },
  photoHead: { width: '100%', gap: 4 },
  photoHint: { fontSize: 10, color: colors.g500 },
  addCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(230,230,229,.5)', alignItems: 'center', justifyContent: 'center' },
  plus: { fontSize: 28, fontWeight: '300', color: colors.g500 },
  photos: { width: '100%', flexDirection: 'row', gap: 12 },
  photo: { width: 94, height: 94, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.g100, borderWidth: 1, borderColor: 'transparent' },
  coverPhoto: { borderColor: colors.primary500, borderWidth: 2 },
  photoImage: { width: '100%', height: '100%' },
  photoAdd: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderColor: colors.g300 },
  removePhoto: { position: 'absolute', right: 5, top: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(126,124,119,.72)', alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.white, fontSize: 18, lineHeight: 20, fontWeight: '600' },
  descriptionBox: { minHeight: 112, borderWidth: 1, borderColor: colors.g300, borderRadius: radius.sm, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, backgroundColor: colors.white },
  descriptionInput: { minHeight: 70, fontSize: 14, lineHeight: 20, color: colors.black, textAlignVertical: 'top' },
  characterCount: { fontSize: 10, color: colors.g500, textAlign: 'right' },
  select: { height: 52, borderWidth: 1, borderColor: colors.g300, borderRadius: radius.sm, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white },
  selectDisabled: { backgroundColor: colors.g100, borderColor: colors.g200 },
  selectText: { flex: 1, fontSize: 16, color: colors.black },
  placeholder: { color: colors.g400 },
  money: { position: 'relative', minWidth: 0 },
  moneyInput: { width: '100%', minWidth: 0, paddingRight: 36 },
  timeRow: { width: '100%', flexDirection: 'row', gap: 12 },
  timeCell: { flex: 1, minWidth: 0 },
  timeRangeError: { fontSize: 12, color: colors.danger, marginTop: 4 },
  requestError: { fontSize: 12, lineHeight: 18, color: colors.danger, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(17,17,17,.28)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 402, maxHeight: '72%', backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: colors.black },
  sheetHint: { fontSize: 12, color: colors.g500, marginTop: 5 },
  options: { maxHeight: 450 },
  option: { minHeight: 54, borderBottomWidth: 1, borderBottomColor: colors.g200, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionText: { fontSize: 16, color: colors.g800 },
  optionSelected: { fontWeight: '600', color: colors.primary700 },
  optionDisabled: { color: colors.g300 },
  optionComingSoon: { fontSize: 12, color: colors.g300 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.g300, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary500 },
  radioDisabled: { borderColor: colors.g200, backgroundColor: colors.g100 },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary500 },
  complete: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 16, paddingTop: 40, paddingBottom: 60, justifyContent: 'space-between' },
  completeBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  completeTitle: { fontSize: 20, fontWeight: '700', color: colors.black, marginTop: 18 },
  completeText: { fontSize: 13, lineHeight: 19, color: colors.g500, textAlign: 'center', marginTop: 8 },
  completeActions: { gap: 0 },
  header: { height: 56 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.black },
});

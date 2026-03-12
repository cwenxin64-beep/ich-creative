import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createCustomizeOrderModalStyles } from './CustomizeOrderModalStyles';
import { Spacing } from '@/constants/theme';

interface CustomizeOrderModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CustomizeOrderData) => Promise<void>;
}

export interface CustomizeOrderData {
  // 基础信息
  name: string;
  phone: string;
  wechat: string;
  city: string;
  // 定制需求信息
  ichCategories: string[];
  sizeLength: string;
  sizeWidth: string;
  sizeHeight: string;
  material: string;
  quantity: string;
  budgetRange: string;
  maxBudget: string;
  deliveryYear: string;
  deliveryMonth: string;
  deliveryDay: string;
  isUrgent: boolean;
  deliveryMethod: string;
  deliveryAddress: string;
  specialRequirements: string;
  referenceImage: string;
  artisanType: string;
}

// 非遗品类
const ICH_CATEGORIES = [
  '剪纸', '刺绣/苏绣/湘绣/粤绣等', '木雕/根雕', '竹编/草编',
  '陶艺/紫砂/瓷绘', '扎染/蜡染', '漆器', '皮影', '年画',
  '糖画', '面塑', '篆刻', '木雕牌匾', '银饰/金属锻打', '其他'
];

// 预算范围
const BUDGET_RANGES = [
  '500元以内', '500-2000元', '2000-5000元', '5000-10000元', '10000元以上'
];

// 交付方式
const DELIVERY_METHODS = ['邮寄（到付/预付运费）', '自提', '同城配送'];

// 手艺人类型
const ARTISAN_TYPES = [
  '国家级传承人', '省级/市级传承人', '青年创作者', '性价比优先', '工艺品质优先'
];

export function CustomizeOrderModal({ visible, onClose, onSubmit }: CustomizeOrderModalProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createCustomizeOrderModalStyles(theme), [theme]);

  const [formData, setFormData] = useState<CustomizeOrderData>({
    // 基础信息
    name: '',
    phone: '',
    wechat: '',
    city: '',
    // 定制需求信息
    ichCategories: [],
    sizeLength: '',
    sizeWidth: '',
    sizeHeight: '',
    material: '',
    quantity: '',
    budgetRange: '',
    maxBudget: '',
    deliveryYear: '',
    deliveryMonth: '',
    deliveryDay: '',
    isUrgent: false,
    deliveryMethod: '',
    deliveryAddress: '',
    specialRequirements: '',
    referenceImage: '',
    artisanType: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const toggleIchCategory = (category: string) => {
    const newCategories = formData.ichCategories.includes(category)
      ? formData.ichCategories.filter(c => c !== category)
      : [...formData.ichCategories, category];
    setFormData({ ...formData, ichCategories: newCategories });
  };

  const handleSubmit = async () => {
    // 验证基础信息
    if (!formData.name.trim()) {
      Alert.alert('提示', '请输入需求人称呼');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('提示', '请输入联系电话');
      return;
    }

    // 验证定制需求
    if (formData.ichCategories.length === 0) {
      Alert.alert('提示', '请至少选择一个非遗品类');
      return;
    }
    if (!formData.quantity.trim()) {
      Alert.alert('提示', '请输入数量要求');
      return;
    }
    if (!formData.budgetRange) {
      Alert.alert('提示', '请选择预算范围');
      return;
    }
    if (!formData.deliveryYear || !formData.deliveryMonth || !formData.deliveryDay) {
      Alert.alert('提示', '请输入期望交付日期');
      return;
    }
    if (!formData.deliveryMethod) {
      Alert.alert('提示', '请选择交付方式');
      return;
    }
    if (!formData.artisanType) {
      Alert.alert('提示', '请选择希望匹配的手艺人类型');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        name: '', phone: '', wechat: '', city: '',
        ichCategories: [], sizeLength: '', sizeWidth: '', sizeHeight: '', material: '',
        quantity: '', budgetRange: '', maxBudget: '',
        deliveryYear: '', deliveryMonth: '', deliveryDay: '',
        isUrgent: false, deliveryMethod: '', deliveryAddress: '',
        specialRequirements: '', referenceImage: '', artisanType: '',
      });
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>
                非遗定制·用户需求单
              </ThemedText>
              <TouchableOpacity onPress={onClose}>
                <FontAwesome6 name="xmark" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView style={styles.modalBody}>
              {/* 模块一：基础信息 */}
              <ThemedView level="default" style={styles.section}>
                <ThemedView level="root" style={styles.sectionHeader}>
                  <FontAwesome6 name="circle-user" size={18} color={theme.primary} />
                  <ThemedText variant="title" color={theme.textPrimary}>
                    基础信息
                  </ThemedText>
                </ThemedView>

                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                      需求人称呼 *
                    </ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                      placeholder="请输入称呼"
                      placeholderTextColor={theme.textMuted}
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                    />
                  </View>

                  <View style={styles.formHalf}>
                    <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                      联系电话 *
                    </ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                      placeholder="请输入手机号"
                      placeholderTextColor={theme.textMuted}
                      value={formData.phone}
                      onChangeText={(text) => setFormData({ ...formData, phone: text })}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                      微信/联系方式
                    </ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                      placeholder="请输入微信号"
                      placeholderTextColor={theme.textMuted}
                      value={formData.wechat}
                      onChangeText={(text) => setFormData({ ...formData, wechat: text })}
                    />
                  </View>

                  <View style={styles.formHalf}>
                    <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                      所在城市
                    </ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                      placeholder="请输入城市"
                      placeholderTextColor={theme.textMuted}
                      value={formData.city}
                      onChangeText={(text) => setFormData({ ...formData, city: text })}
                    />
                  </View>
                </View>
              </ThemedView>

              {/* 模块二：定制需求信息 */}
              <ThemedView level="default" style={styles.section}>
                <ThemedView level="root" style={styles.sectionHeader}>
                  <FontAwesome6 name="clipboard-list" size={18} color={theme.primary} />
                  <ThemedText variant="title" color={theme.textPrimary}>
                    定制需求信息
                  </ThemedText>
                </ThemedView>

                {/* 1. 非遗品类 */}
                <View style={styles.formItem}>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                    非遗品类（可多选）*
                  </ThemedText>
                  <View style={styles.tagContainer}>
                    {ICH_CATEGORIES.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.tagButton,
                          formData.ichCategories.includes(category) && styles.tagButtonActive,
                          { backgroundColor: formData.ichCategories.includes(category) ? theme.primary : theme.backgroundTertiary }
                        ]}
                        onPress={() => toggleIchCategory(category)}
                      >
                        <ThemedText
                          variant="caption"
                          color={formData.ichCategories.includes(category) ? theme.buttonPrimaryText : theme.textSecondary}
                        >
                          {category}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {formData.ichCategories.includes('其他') && (
                    <TextInput
                      style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary, marginTop: Spacing.sm }]}
                      placeholder="请输入其他非遗品类"
                      placeholderTextColor={theme.textMuted}
                      value={formData.material}
                      onChangeText={(text) => setFormData({ ...formData, material: text })}
                    />
                  )}
                </View>

                {/* 2. 尺寸/材质要求 */}
                <View style={styles.formItem}>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                    尺寸/材质要求
                  </ThemedText>
                  <View style={styles.sizeInputs}>
                    <View style={styles.sizeInputWrapper}>
                      <ThemedText variant="caption" color={theme.textSecondary}>长</ThemedText>
                      <TextInput
                        style={[styles.sizeInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                        placeholder="cm"
                        placeholderTextColor={theme.textMuted}
                        value={formData.sizeLength}
                        onChangeText={(text) => setFormData({ ...formData, sizeLength: text })}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.sizeInputWrapper}>
                      <ThemedText variant="caption" color={theme.textSecondary}>宽</ThemedText>
                      <TextInput
                        style={[styles.sizeInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                        placeholder="cm"
                        placeholderTextColor={theme.textMuted}
                        value={formData.sizeWidth}
                        onChangeText={(text) => setFormData({ ...formData, sizeWidth: text })}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.sizeInputWrapper}>
                      <ThemedText variant="caption" color={theme.textSecondary}>高</ThemedText>
                      <TextInput
                        style={[styles.sizeInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                        placeholder="cm"
                        placeholderTextColor={theme.textMuted}
                        value={formData.sizeHeight}
                        onChangeText={(text) => setFormData({ ...formData, sizeHeight: text })}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                  <TextInput
                    style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary, marginTop: Spacing.sm }]}
                    placeholder="材质偏好"
                    placeholderTextColor={theme.textMuted}
                    value={formData.material}
                    onChangeText={(text) => setFormData({ ...formData, material: text })}
                  />
                </View>

                {/* 3. 数量要求 */}
                <View style={styles.formItem}>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                    数量要求 *
                  </ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                    placeholder="请输入数量"
                    placeholderTextColor={theme.textMuted}
                    value={formData.quantity}
                    onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                    keyboardType="number-pad"
                  />
                </View>

                {/* 4. 预算范围 */}
                <View style={styles.formItem}>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                    预算范围 *
                  </ThemedText>
                  <View style={styles.tagContainer}>
                    {BUDGET_RANGES.map((range) => (
                      <TouchableOpacity
                        key={range}
                        style={[
                          styles.tagButton,
                          formData.budgetRange === range && styles.tagButtonActive,
                          { backgroundColor: formData.budgetRange === range ? theme.primary : theme.backgroundTertiary }
                        ]}
                        onPress={() => setFormData({ ...formData, budgetRange: range })}
                      >
                        <ThemedText
                          variant="caption"
                          color={formData.budgetRange === range ? theme.buttonPrimaryText : theme.textSecondary}
                        >
                          {range}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary, marginTop: Spacing.sm }]}
                    placeholder="可接受最高预算（元）"
                    placeholderTextColor={theme.textMuted}
                    value={formData.maxBudget}
                    onChangeText={(text) => setFormData({ ...formData, maxBudget: text })}
                    keyboardType="number-pad"
                  />
                </View>

                {/* 5. 期望完成时间 */}
                <View style={styles.formItem}>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                    期望完成时间 *
                  </ThemedText>
                  <View style={styles.dateInputs}>
                    <TextInput
                      style={[styles.dateInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                      placeholder="年"
                      placeholderTextColor={theme.textMuted}
                      value={formData.deliveryYear}
                      onChangeText={(text) => setFormData({ ...formData, deliveryYear: text })}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                    <TextInput
                      style={[styles.dateInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                      placeholder="月"
                      placeholderTextColor={theme.textMuted}
                      value={formData.deliveryMonth}
                      onChangeText={(text) => setFormData({ ...formData, deliveryMonth: text })}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <TextInput
                      style={[styles.dateInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                      placeholder="日"
                      placeholderTextColor={theme.textMuted}
                      value={formData.deliveryDay}
                      onChangeText={(text) => setFormData({ ...formData, deliveryDay: text })}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.toggleRow, { backgroundColor: theme.backgroundTertiary }]}
                    onPress={() => setFormData({ ...formData, isUrgent: !formData.isUrgent })}
                  >
                    <ThemedText variant="caption" color={theme.textSecondary}>
                      是否可加急
                    </ThemedText>
                    <View style={[styles.toggleIndicator, formData.isUrgent && { backgroundColor: theme.primary }]} />
                  </TouchableOpacity>
                </View>

                {/* 6. 交付方式 */}
                <View style={styles.formItem}>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                    交付方式 *
                  </ThemedText>
                  <View style={styles.tagContainer}>
                    {DELIVERY_METHODS.map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.tagButton,
                          formData.deliveryMethod === method && styles.tagButtonActive,
                          { backgroundColor: formData.deliveryMethod === method ? theme.primary : theme.backgroundTertiary }
                        ]}
                        onPress={() => setFormData({ ...formData, deliveryMethod: method })}
                      >
                        <ThemedText
                          variant="caption"
                          color={formData.deliveryMethod === method ? theme.buttonPrimaryText : theme.textSecondary}
                        >
                          {method}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary, marginTop: Spacing.sm }]}
                    placeholder="收货地址"
                    placeholderTextColor={theme.textMuted}
                    value={formData.deliveryAddress}
                    onChangeText={(text) => setFormData({ ...formData, deliveryAddress: text })}
                  />
                </View>

                {/* 7. 特殊要求 */}
                <View style={styles.formItem}>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                    特殊要求
                  </ThemedText>
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.formHint}>
                    （工艺、包装、证书、落款、版权、发票等）
                  </ThemedText>
                  <TextInput
                    style={[styles.formInput, styles.formInputMultiline, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                    placeholder="请描述您的特殊要求"
                    placeholderTextColor={theme.textMuted}
                    value={formData.specialRequirements}
                    onChangeText={(text) => setFormData({ ...formData, specialRequirements: text })}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* 8. 上传参考图 */}
                <View style={styles.formItem}>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                    上传参考图/效果图（可选）
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.uploadButton}
                  >
                    <FontAwesome6 name="image" size={20} color={theme.primary} />
                    <ThemedText variant="caption" color={theme.primary}>
                      点击上传图片
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {/* 9. 希望匹配的手艺人类型 */}
                <View style={styles.formItem}>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                    希望匹配的手艺人类型 *
                  </ThemedText>
                  <View style={styles.tagContainer}>
                    {ARTISAN_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.tagButton,
                          formData.artisanType === type && styles.tagButtonActive,
                          { backgroundColor: formData.artisanType === type ? theme.primary : theme.backgroundTertiary }
                        ]}
                        onPress={() => setFormData({ ...formData, artisanType: type })}
                      >
                        <ThemedText
                          variant="caption"
                          color={formData.artisanType === type ? theme.buttonPrimaryText : theme.textSecondary}
                        >
                          {type}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ThemedView>
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={onClose}
              >
                <ThemedText variant="title" color={theme.textSecondary}>
                  取消
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, submitting && styles.modalButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <ThemedText variant="title" color={submitting ? theme.textMuted : theme.buttonPrimaryText}>
                  {submitting ? '提交中...' : '提交需求单'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

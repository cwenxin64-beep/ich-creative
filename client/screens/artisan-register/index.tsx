import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

interface FormData {
  // 基本信息
  name: string;
  gender: string;
  phone: string;
  wechat: string;
  province: string;
  city: string;
  district: string;
  address: string;
  // 非遗身份与资质
  projectName: string;
  level: string;
  years: string;
  lineage: string;
  hasCertificate: string;
  // 擅长工艺与服务范围
  crafts: string;
  services: string[];
  smallItemDays: string;
  mediumItemDays: string;
  largeItemDays: string;
  urgent: boolean;
  urgentFee: string;
  startPrice: string;
  priceRange: string;
  adjustable: boolean;
}

export default function ArtisanRegisterScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [formData, setFormData] = useState<FormData>({
    // 基本信息
    name: '',
    gender: '',
    phone: '',
    wechat: '',
    province: '',
    city: '',
    district: '',
    address: '',
    // 非遗身份与资质
    projectName: '',
    level: '',
    years: '',
    lineage: '',
    hasCertificate: 'none',
    // 擅长工艺与服务范围
    crafts: '',
    services: [],
    smallItemDays: '',
    mediumItemDays: '',
    largeItemDays: '',
    urgent: false,
    urgentFee: '',
    startPrice: '',
    priceRange: '',
    adjustable: false,
  });

  const [loading, setLoading] = useState(false);

  const handleGenderSelect = (gender: string) => {
    setFormData({ ...formData, gender });
  };

  const handleLevelSelect = (level: string) => {
    setFormData({ ...formData, level });
  };

  const handleCertificateSelect = (value: string) => {
    setFormData({ ...formData, hasCertificate: value });
  };

  const toggleService = (service: string) => {
    const newServices = formData.services.includes(service)
      ? formData.services.filter(s => s !== service)
      : [...formData.services, service];
    setFormData({ ...formData, services: newServices });
  };

  const handleSubmit = async () => {
    // 验证基本信息
    if (!formData.name.trim()) {
      Alert.alert('提示', '请输入姓名');
      return;
    }
    if (!formData.gender) {
      Alert.alert('提示', '请选择性别');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('提示', '请输入联系电话');
      return;
    }
    if (!formData.province.trim() || !formData.city.trim()) {
      Alert.alert('提示', '请选择所在地区');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('提示', '请输入详细地址');
      return;
    }

    // 验证非遗身份
    if (!formData.projectName.trim()) {
      Alert.alert('提示', '请输入非遗项目名称');
      return;
    }
    if (!formData.level) {
      Alert.alert('提示', '请选择传承级别');
      return;
    }
    if (!formData.years.trim()) {
      Alert.alert('提示', '请输入从业年限');
      return;
    }

    // 验证服务范围
    if (formData.services.length === 0) {
      Alert.alert('提示', '请至少选择一项可承接类型');
      return;
    }

    setLoading(true);

    try {
      /**
       * 服务端文件：server/src/routes/users.ts
       * 接口：POST /api/v1/users/artisan-register
       * Body 参数：name: string, gender: string, phone: string, wechat: string, province: string, city: string, district: string, address: string, projectName: string, level: string, years: string, lineage: string, hasCertificate: string, crafts: string, services: string[], smallItemDays: string, mediumItemDays: string, largeItemDays: string, urgent: boolean, urgentFee: string, startPrice: string, priceRange: string, adjustable: boolean
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/artisan-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('注册成功', '您的非遗手艺人账号已提交审核，请耐心等待审核结果', [
          { text: '确定', onPress: () => router.replace('/') }
        ]);
      } else {
        Alert.alert('注册失败', result.message || '请检查网络连接');
      }
    } catch (error) {
      console.error('Artisan register error:', error);
      Alert.alert('注册失败', '请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <ThemedView level="root" style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText variant="h2" color={theme.textPrimary}>
              非遗手艺人注册
            </ThemedText>
          </ThemedView>

          {/* Section 1: 基本信息 */}
          <ThemedView level="root" style={styles.section}>
            <ThemedView level="default" style={styles.sectionHeader}>
              <FontAwesome6 name="circle-user" size={20} color={theme.primary} />
              <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
                基本信息
              </ThemedText>
            </ThemedView>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                  姓名
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                  placeholder="请输入姓名"
                  placeholderTextColor={theme.textMuted}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formHalf}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                  性别
                </ThemedText>
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[styles.genderButton, formData.gender === 'male' && styles.genderButtonActive]}
                    onPress={() => handleGenderSelect('male')}
                  >
                    <ThemedText variant="caption" color={formData.gender === 'male' ? theme.buttonPrimaryText : theme.textSecondary}>
                      男
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderButton, formData.gender === 'female' && styles.genderButtonActive]}
                    onPress={() => handleGenderSelect('female')}
                  >
                    <ThemedText variant="caption" color={formData.gender === 'female' ? theme.buttonPrimaryText : theme.textSecondary}>
                      女
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                  联系电话
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

              <View style={styles.formHalf}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                  微信号
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                  placeholder="请输入微信号"
                  placeholderTextColor={theme.textMuted}
                  value={formData.wechat}
                  onChangeText={(text) => setFormData({ ...formData, wechat: text })}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formThird}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                  省
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                  placeholder="省份"
                  placeholderTextColor={theme.textMuted}
                  value={formData.province}
                  onChangeText={(text) => setFormData({ ...formData, province: text })}
                />
              </View>

              <View style={styles.formThird}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                  市
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                  placeholder="城市"
                  placeholderTextColor={theme.textMuted}
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                />
              </View>

              <View style={styles.formThird}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                  区/县
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                  placeholder="区县"
                  placeholderTextColor={theme.textMuted}
                  value={formData.district}
                  onChangeText={(text) => setFormData({ ...formData, district: text })}
                />
              </View>
            </View>

            <View style={styles.formItem}>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                详细地址
              </ThemedText>
              <TextInput
                style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                placeholder="请输入详细地址"
                placeholderTextColor={theme.textMuted}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
              />
            </View>
          </ThemedView>

          {/* Section 2: 非遗身份与资质 */}
          <ThemedView level="root" style={styles.section}>
            <ThemedView level="default" style={styles.sectionHeader}>
              <FontAwesome6 name="award" size={20} color={theme.primary} />
              <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
                非遗身份与资质
              </ThemedText>
            </ThemedView>

            <View style={styles.formItem}>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                非遗项目名称
              </ThemedText>
              <TextInput
                style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                placeholder="请输入非遗项目名称"
                placeholderTextColor={theme.textMuted}
                value={formData.projectName}
                onChangeText={(text) => setFormData({ ...formData, projectName: text })}
              />
            </View>

            <View style={styles.formItem}>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                传承级别
              </ThemedText>
              <View style={styles.tagContainer}>
                {['国家级', '省级', '市级', '县级', '非遗工坊', '青年创作者'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.tagButton,
                      formData.level === level && styles.tagButtonActive,
                      { backgroundColor: formData.level === level ? theme.primary : theme.backgroundTertiary }
                    ]}
                    onPress={() => handleLevelSelect(level)}
                  >
                    <ThemedText
                      variant="caption"
                      color={formData.level === level ? theme.buttonPrimaryText : theme.textSecondary}
                    >
                      {level}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                  从业年限
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                  placeholder="年"
                  placeholderTextColor={theme.textMuted}
                  value={formData.years}
                  onChangeText={(text) => setFormData({ ...formData, years: text })}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formHalf}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                  师承/流派
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                  placeholder="请输入师承或流派"
                  placeholderTextColor={theme.textMuted}
                  value={formData.lineage}
                  onChangeText={(text) => setFormData({ ...formData, lineage: text })}
                />
              </View>
            </View>

            <View style={styles.formItem}>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                资质证书
              </ThemedText>
              <View style={styles.tagContainer}>
                {['传承人证书', '获奖证书', '作品专利/版权', '无证书'].map((cert) => (
                  <TouchableOpacity
                    key={cert}
                    style={[
                      styles.tagButton,
                      formData.hasCertificate === cert && styles.tagButtonActive,
                      { backgroundColor: formData.hasCertificate === cert ? theme.primary : theme.backgroundTertiary }
                    ]}
                    onPress={() => handleCertificateSelect(cert)}
                  >
                    <ThemedText
                      variant="caption"
                      color={formData.hasCertificate === cert ? theme.buttonPrimaryText : theme.textSecondary}
                    >
                      {cert}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ThemedView>

          {/* Section 3: 擅长工艺与服务范围 */}
          <ThemedView level="root" style={styles.section}>
            <ThemedView level="default" style={styles.sectionHeader}>
              <FontAwesome6 name="palette" size={20} color={theme.primary} />
              <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
                擅长工艺与服务范围
              </ThemedText>
            </ThemedView>

            <View style={styles.formItem}>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                擅长工艺
              </ThemedText>
              <TextInput
                style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary, height: 80 }]}
                placeholder="请描述您擅长的工艺（可多选）"
                placeholderTextColor={theme.textMuted}
                value={formData.crafts}
                onChangeText={(text) => setFormData({ ...formData, crafts: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formItem}>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                可承接类型（可多选）
              </ThemedText>
              <View style={styles.tagContainer}>
                {['纯手工定制', '批量文创', '礼品定制', '摆件/装饰', '教学体验', '现场展演', '企业合作'].map((service) => (
                  <TouchableOpacity
                    key={service}
                    style={[
                      styles.tagButton,
                      formData.services.includes(service) && styles.tagButtonActive,
                      { backgroundColor: formData.services.includes(service) ? theme.primary : theme.backgroundTertiary }
                    ]}
                    onPress={() => toggleService(service)}
                  >
                    <ThemedText
                      variant="caption"
                      color={formData.services.includes(service) ? theme.buttonPrimaryText : theme.textSecondary}
                    >
                      {service}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formItem}>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                常规工期
              </ThemedText>
              <View style={styles.formRow}>
                <View style={styles.formThird}>
                  <TextInput
                    style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                    placeholder="小件（天）"
                    placeholderTextColor={theme.textMuted}
                    value={formData.smallItemDays}
                    onChangeText={(text) => setFormData({ ...formData, smallItemDays: text })}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.formThird}>
                  <TextInput
                    style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                    placeholder="中件（天）"
                    placeholderTextColor={theme.textMuted}
                    value={formData.mediumItemDays}
                    onChangeText={(text) => setFormData({ ...formData, mediumItemDays: text })}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.formThird}>
                  <TextInput
                    style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                    placeholder="大件（天）"
                    placeholderTextColor={theme.textMuted}
                    value={formData.largeItemDays}
                    onChangeText={(text) => setFormData({ ...formData, largeItemDays: text })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                  起步价（元）
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                  placeholder="请输入起步价"
                  placeholderTextColor={theme.textMuted}
                  value={formData.startPrice}
                  onChangeText={(text) => setFormData({ ...formData, startPrice: text })}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formHalf}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                  常规价位（元）
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                  placeholder="如：100-500"
                  placeholderTextColor={theme.textMuted}
                  value={formData.priceRange}
                  onChangeText={(text) => setFormData({ ...formData, priceRange: text })}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.toggleRow, { backgroundColor: theme.backgroundTertiary }]}
              onPress={() => setFormData({ ...formData, urgent: !formData.urgent })}
            >
              <ThemedText variant="caption" color={theme.textSecondary}>
                是否接受加急
              </ThemedText>
              <View style={[styles.toggleIndicator, formData.urgent && { backgroundColor: theme.primary }]} />
            </TouchableOpacity>

            {formData.urgent && (
              <View style={styles.formItem}>
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.formLabel}>
                  加急费（元）
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
                  placeholder="请输入加急费用"
                  placeholderTextColor={theme.textMuted}
                  value={formData.urgentFee}
                  onChangeText={(text) => setFormData({ ...formData, urgentFee: text })}
                  keyboardType="number-pad"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.toggleRow, { backgroundColor: theme.backgroundTertiary }]}
              onPress={() => setFormData({ ...formData, adjustable: !formData.adjustable })}
            >
              <ThemedText variant="caption" color={theme.textSecondary}>
                是否可按预算调整
              </ThemedText>
              <View style={[styles.toggleIndicator, formData.adjustable && { backgroundColor: theme.primary }]} />
            </TouchableOpacity>
          </ThemedView>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <FontAwesome6 name="circle-check" size={20} color={theme.buttonPrimaryText} />
            <ThemedText variant="title" color={theme.buttonPrimaryText} style={styles.submitButtonText}>
              {loading ? '提交中...' : '提交审核'}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

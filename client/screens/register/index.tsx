import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

export default function RegisterScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!formData.username.trim()) {
      Alert.alert('提示', '请输入用户名');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('提示', '请输入邮箱');
      return;
    }
    if (!formData.password) {
      Alert.alert('提示', '请输入密码');
      return;
    }
    if (formData.password.length < 6) {
      Alert.alert('提示', '密码长度至少6位');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('提示', '两次密码不一致');
      return;
    }

    setLoading(true);

    try {
      // TODO: 实现真实的注册 API 调用
      // const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/register`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     username: formData.username,
      //     email: formData.email,
      //     password: formData.password,
      //   }),
      // });

      // 模拟注册成功
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert('注册成功', '欢迎加入智能非遗！', [
        { text: '确定', onPress: () => router.push('/home') }
      ]);
    } catch (error) {
      console.error('Register error:', error);
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
              注册账号
            </ThemedText>
          </ThemedView>

          {/* Logo */}
          <ThemedView level="root" style={styles.logoSection}>
            <View style={[styles.logoContainer, { backgroundColor: theme.backgroundDefault }]}>
              <FontAwesome6 name="vault" size={60} color={theme.primary} />
            </View>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.logoTitle}>
              智能非遗
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>
              开启非遗创意之旅
            </ThemedText>
          </ThemedView>

          {/* Form */}
          <ThemedView level="root" style={styles.formSection}>
            <View style={styles.inputGroup}>
              <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.inputLabel}>
                用户名
              </ThemedText>
              <View style={styles.inputContainer}>
                <FontAwesome6 name="user" size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.textPrimary }]}
                  placeholder="请输入用户名"
                  placeholderTextColor={theme.textMuted}
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.inputLabel}>
                邮箱
              </ThemedText>
              <View style={styles.inputContainer}>
                <FontAwesome6 name="envelope" size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.textPrimary }]}
                  placeholder="请输入邮箱"
                  placeholderTextColor={theme.textMuted}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.inputLabel}>
                密码
              </ThemedText>
              <View style={styles.inputContainer}>
                <FontAwesome6 name="lock" size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.textPrimary }]}
                  placeholder="请输入密码（至少6位）"
                  placeholderTextColor={theme.textMuted}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.inputLabel}>
                确认密码
              </ThemedText>
              <View style={styles.inputContainer}>
                <FontAwesome6 name="lock" size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: theme.textPrimary }]}
                  placeholder="请再次输入密码"
                  placeholderTextColor={theme.textMuted}
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                  secureTextEntry
                />
              </View>
            </View>
          </ThemedView>

          {/* Register Button */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 },
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            <FontAwesome6 name="user-plus" size={20} color={theme.buttonPrimaryText} />
            <ThemedText variant="title" color={theme.buttonPrimaryText} style={styles.registerButtonText}>
              {loading ? '注册中...' : '立即注册'}
            </ThemedText>
          </TouchableOpacity>

          {/* Heritage Artisan Registration */}
          <TouchableOpacity
            style={[
              styles.artisanButton,
              { borderColor: theme.primary, backgroundColor: 'transparent' },
            ]}
            onPress={() => router.push('/artisan-register')}
          >
            <FontAwesome6 name="palette" size={20} color={theme.primary} />
            <ThemedText variant="body" color={theme.primary} style={styles.artisanButtonText}>
              非遗手艺人注册
            </ThemedText>
          </TouchableOpacity>

          {/* Terms */}
          <ThemedView level="root" style={styles.termsSection}>
            <ThemedText variant="caption" color={theme.textMuted}>
              注册即表示同意
              <ThemedText variant="caption" color={theme.primary}>
                {' 用户协议 '}
              </ThemedText>
              和
              <ThemedText variant="caption" color={theme.primary}>
                {' 隐私政策'}
              </ThemedText>
            </ThemedText>
          </ThemedView>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

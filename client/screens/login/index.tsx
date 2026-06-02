import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { createStyles } from './styles';

export default function LoginScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { loginWithEmail } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) {
      setError('请输入邮箱');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await loginWithEmail(email.trim(), password);
      // 登录成功后 AuthContext 路由守卫会自动跳转
    } catch (err: any) {
      setError(err.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo 区域 */}
          <View style={styles.logoSection}>
            <View style={[styles.logoContainer, { backgroundColor: theme.primary }]}>
              <FontAwesome6 name="palette" size={40} color="#FFFFFF" />
            </View>
            <ThemedText style={[styles.logoTitle, { color: theme.text }]}>
              智能非遗创意平台
            </ThemedText>
            <ThemedText style={[styles.logoSubtitle, { color: theme.textSecondary }]}>
              登录你的账户，开启创意之旅
            </ThemedText>
          </View>

          {/* 表单区域 */}
          <View style={styles.formSection}>
            {/* 邮箱 */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                邮箱
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: error && !email.trim() ? '#EF4444' : theme.border }]}>
                <FontAwesome6 name="envelope" size={16} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="请输入邮箱"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            {/* 密码 */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                密码
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: error && !password ? '#EF4444' : theme.border }]}>
                <FontAwesome6 name="lock" size={16} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="请输入密码"
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <FontAwesome6
                    name={showPassword ? 'eye' : 'eye-slash'}
                    size={16}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* 错误提示 */}
            {error ? (
              <View style={styles.errorContainer}>
                <FontAwesome6 name="circle-exclamation" size={14} color="#EF4444" />
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            ) : null}

            {/* 登录按钮 */}
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: theme.primary }, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <FontAwesome6 name="right-to-bracket" size={16} color="#FFFFFF" style={styles.buttonIcon} />
                  <ThemedText style={styles.loginButtonText}>登 录</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 注册引导 */}
          <View style={styles.footerSection}>
            <ThemedText style={[styles.footerText, { color: theme.textSecondary }]}>
              还没有账户？
            </ThemedText>
            <TouchableOpacity onPress={() => router.replace('/register')} disabled={loading}>
              <ThemedText style={[styles.footerLink, { color: theme.primary }]}>
                立即注册
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <Toast visible={toastVisible} message={toastMessage} onHide={hideToast} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email.includes('@')) e.email = 'Enter a valid email';
    if (password.length < 6) e.password = 'Min. 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Login failed', err.message ?? 'Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />

      {/* Gradient background */}
      <LinearGradient
        colors={['#064E3B', '#065F46', '#047857']}
        style={{ flex: 1 }}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      >
        {/* Logo section */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 28,
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16,
          }}>
            <Ionicons name="flame" size={40} color="white" />
          </View>
          <Text style={{ color: 'white', fontSize: 34, fontWeight: '800', letterSpacing: -0.5 }}>CaloriTracker</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginTop: 6 }}>Your personal health companion</Text>

          {/* Feature pills */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
            {['🍎 Food', '💪 Exercise', '📊 Progress'].map((tag) => (
              <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' }}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom sheet */}
        <View style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 32, borderTopRightRadius: 32,
          paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40,
          shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 24,
        }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>Welcome back</Text>
          <Text style={{ fontSize: 14, color: '#94A3B8', marginBottom: 28 }}>Sign in to continue your journey</Text>

          <View style={{ gap: 14 }}>
            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              leftIcon={<Ionicons name="mail-outline" size={18} color="#94A3B8" />}
            />

            <View>
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPw}
                error={errors.password}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
                <Text style={{ color: '#059669', fontSize: 13, fontWeight: '600' }}>{showPw ? 'Hide' : 'Show'} password</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginTop: 24 }}>
            <Button title="Sign In" onPress={handleLogin} loading={loading} size="lg" />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 4 }}>
            <Text style={{ color: '#94A3B8', fontSize: 14 }}>Don't have an account?</Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={{ color: '#059669', fontSize: 14, fontWeight: '700' }}> Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

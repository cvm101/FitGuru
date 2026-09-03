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
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import GrainOverlay from '@/components/ui/GrainOverlay';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.includes('@')) e.email = 'Enter a valid email';
    if (password.length < 6) e.password = 'Min. 6 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim(), password);
      router.replace('/(auth)/onboarding');
    } catch (err: any) {
      Alert.alert('Registration failed', err.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#065F46', '#047857', '#059669']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <GrainOverlay />
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 64, paddingBottom: 24 }}>
          <View style={{
            width: 68, height: 68, borderRadius: 24,
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
            alignItems: 'center', justifyContent: 'center', marginBottom: 14,
          }}>
            <Ionicons name="person-add" size={32} color="white" />
          </View>
          <Text style={{ color: 'white', fontSize: 28, fontWeight: '800' }}>Create Account</Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, marginTop: 4 }}>Start your health journey today</Text>
        </View>

        {/* Form card - scrollable */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            backgroundColor: 'white',
            borderTopLeftRadius: 32, borderTopRightRadius: 32,
            paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 14 }}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              autoCapitalize="words"
              error={errors.name}
              leftIcon={<Ionicons name="person-outline" size={18} color="#94A3B8" />}
            />
            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon={<Ionicons name="mail-outline" size={18} color="#94A3B8" />}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              secureTextEntry
              error={errors.password}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />}
            />
            <Input
              label="Confirm Password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter password"
              secureTextEntry
              error={errors.confirm}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />}
            />
          </View>

          <View style={{ marginTop: 28 }}>
            <Button title="Create Account" onPress={handleRegister} loading={loading} size="lg" />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 4 }}>
            <Text style={{ color: '#94A3B8', fontSize: 14 }}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={{ color: '#059669', fontSize: 14, fontWeight: '700' }}> Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

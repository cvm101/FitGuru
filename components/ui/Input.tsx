import { View, TextInput, Text, TextInputProps } from 'react-native';
import { useTheme } from '@/lib/context/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export default function Input({ label, error, leftIcon, ...props }: InputProps) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text style={{ color: colors.label, fontWeight: '600', fontSize: 13, marginBottom: 2 }}>{label}</Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.inputBg,
          borderWidth: 1.5,
          borderColor: error ? '#EF4444' : colors.inputBorder,
          borderRadius: 14,
          paddingHorizontal: 14,
          height: 54,
        }}
      >
        {leftIcon && <View style={{ marginRight: 10 }}>{leftIcon}</View>}
        <TextInput
          style={{ flex: 1, color: colors.text, fontSize: 15, height: '100%' }}
          placeholderTextColor={colors.textMuted}
          {...props}
        />
      </View>
      {error && (
        <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 2 }}>{error}</Text>
      )}
    </View>
  );
}

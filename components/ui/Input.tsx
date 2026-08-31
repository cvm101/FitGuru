import { View, TextInput, Text, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export default function Input({ label, error, leftIcon, className = '', ...props }: InputProps) {
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text style={{ color: '#374151', fontWeight: '600', fontSize: 13, marginBottom: 2 }}>{label}</Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#F8FAFC',
          borderWidth: 1.5,
          borderColor: error ? '#EF4444' : '#E2E8F0',
          borderRadius: 14,
          paddingHorizontal: 14,
          height: 54,
        }}
      >
        {leftIcon && <View style={{ marginRight: 10 }}>{leftIcon}</View>}
        <TextInput
          style={{ flex: 1, color: '#0F172A', fontSize: 15, height: '100%' }}
          placeholderTextColor="#94A3B8"
          {...props}
        />
      </View>
      {error && (
        <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 2 }}>{error}</Text>
      )}
    </View>
  );
}

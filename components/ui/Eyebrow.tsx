import { View, Text } from 'react-native';

interface EyebrowProps {
  label: string;
  color?: string;
  bg?: string;
}

export default function Eyebrow({ label, color = '#059669', bg = '#ECFDF5' }: EyebrowProps) {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 }}>
      <Text style={{ color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}

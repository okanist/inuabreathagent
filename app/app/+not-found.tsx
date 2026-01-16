import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { THEME } from '../src/constants/config';
import { TopBar } from '../src/components/TopBar';

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Oops!' }} />
            <View style={styles.container}>
                <TopBar title="Not Found" />
                <View style={styles.content}>
                    <Text style={styles.title}>This screen doesn't exist.</Text>
                    <Link href="/" style={styles.link}>
                        <Text style={styles.linkText}>Go to home screen!</Text>
                    </Link>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.colors.background,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: THEME.colors.text,
        marginBottom: 20,
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
    linkText: {
        fontSize: 14,
        color: THEME.colors.secondary,
    },
});

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { TreeListScreen } from '../screens/tree/TreeListScreen';
import { TreeViewScreen } from '../screens/tree/TreeViewScreen';
import { CreateTreeScreen } from '../screens/tree/CreateTreeScreen';
import { ShareTreeScreen } from '../screens/tree/ShareTreeScreen';
import { AddNodeScreen, NodeDetailScreen, EditNodeScreen } from '../screens/node';
import { AddRelationshipScreen } from '../screens/relationship';
import { TimelineScreen, CreateEventScreen } from '../screens/timeline';
import { SearchScreen } from '../screens/search';
import { CreateSamePersonLinkScreen, AccessRequestsScreen } from '../screens/same-person-link';
import { NotificationsScreen } from '../screens/notification';
import { AlbumListScreen, LinkAlbumScreen } from '../screens/album';
import { NotificationBadge } from '../components';
import { authService } from '../services/authService';
import { clearUser } from '../store/slices/authSlice';

export type MainStackParamList = {
  TreeList: undefined;
  TreeView: { treeId: string };
  CreateTree: undefined;
  ShareTree: { treeId: string; treeName: string };
  AddNode: { treeId: string };
  NodeDetail: { nodeId: string; treeId: string };
  EditNode: { nodeId: string; treeId: string };
  AddRelationship: { treeId: string; preselectedNodeId?: string };
  Timeline: { treeId: string };
  CreateEvent: { treeId: string };
  Search: undefined;
  CreateSamePersonLink: { nodeId: string; treeId: string; nodeName: string };
  AccessRequests: { treeId: string; treeName: string };
  Notifications: undefined;
  AlbumList: { treeId: string; treeName: string };
  LinkAlbum: { treeId: string; treeName: string };
};

const Stack = createStackNavigator<MainStackParamList>();

export const MainNavigator: React.FC = () => {
  const dispatch = useDispatch();

  const handleLogout = async () => {
    await authService.logout();
    dispatch(clearUser());
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#007AFF' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="TreeList"
        component={TreeListScreen}
        options={({ navigation }) => ({
          title: 'My Family Trees',
          headerLeft: () => (
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Search')}>
              <Text style={styles.headerButtonText}>🔍</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              <NotificationBadge onPress={() => navigation.navigate('Notifications')} />
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          ),
        })}
      />
      <Stack.Screen
        name="TreeView"
        component={TreeViewScreen}
        options={{ title: 'Family Tree' }}
      />
      <Stack.Screen
        name="CreateTree"
        component={CreateTreeScreen}
        options={{ title: 'Create Tree' }}
      />
      <Stack.Screen
        name="ShareTree"
        component={ShareTreeScreen}
        options={{ title: 'Share Tree' }}
      />
      <Stack.Screen
        name="AddNode"
        component={AddNodeScreen}
        options={{ title: 'Add Family Member' }}
      />
      <Stack.Screen
        name="NodeDetail"
        component={NodeDetailScreen}
        options={{ title: 'Family Member' }}
      />
      <Stack.Screen
        name="EditNode"
        component={EditNodeScreen}
        options={{ title: 'Edit Family Member' }}
      />
      <Stack.Screen
        name="AddRelationship"
        component={AddRelationshipScreen}
        options={{ title: 'Add Relationship' }}
      />
      <Stack.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{ title: 'Timeline' }}
      />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ title: 'Add Event' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <Stack.Screen
        name="CreateSamePersonLink"
        component={CreateSamePersonLinkScreen}
        options={{ title: 'Link Same Person' }}
      />
      <Stack.Screen
        name="AccessRequests"
        component={AccessRequestsScreen}
        options={{ title: 'Access Requests' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="AlbumList"
        component={AlbumListScreen}
        options={{ title: 'Photo Albums' }}
      />
      <Stack.Screen
        name="LinkAlbum"
        component={LinkAlbumScreen}
        options={{ title: 'Link Album' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  logoutButton: { marginRight: 0 },
  logoutText: { color: '#fff', fontSize: 16 },
  headerButton: { marginLeft: 16 },
  headerButtonText: { color: '#fff', fontSize: 20 },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
});

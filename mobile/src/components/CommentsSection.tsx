import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentService } from '../services/commentService';
import { Comment, EntityType } from '../types';

interface CommentsSectionProps {
  treeId: string;
  entityType: EntityType;
  entityId: string;
  currentUserId: string;
}

interface CommentItemProps {
  comment: Comment;
  isOwner: boolean;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
}

const formatTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const CommentItem: React.FC<CommentItemProps> = ({ comment, isOwner, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);

  const handleLongPress = () => {
    if (isOwner) setShowActions(true);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setShowActions(false) },
        { text: 'Delete', style: 'destructive', onPress: () => {
          onDelete(comment.commentId);
          setShowActions(false);
        }},
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.commentItem}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Text style={styles.commentAvatarText}>👤</Text>
        </View>
        <View style={styles.commentMeta}>
          <Text style={styles.commentTimestamp}>{formatTimestamp(comment.createdAt)}</Text>
          {comment.updatedAt !== comment.createdAt && (
            <Text style={styles.editedLabel}>(edited)</Text>
          )}
        </View>
      </View>
      <Text style={styles.commentText}>{comment.commentText}</Text>
      
      {showActions && isOwner && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              onEdit(comment);
              setShowActions(false);
            }}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowActions(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  treeId,
  entityType,
  entityId,
  currentUserId,
}) => {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState('');

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', treeId, entityType, entityId],
    queryFn: () => commentService.getComments(treeId, entityType, entityId),
  });

  const createMutation = useMutation({
    mutationFn: (commentText: string) =>
      commentService.createComment({ treeId, entityType, entityId, commentText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', treeId, entityType, entityId] });
      setNewComment('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to add comment');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ commentId, commentText }: { commentId: string; commentText: string }) =>
      commentService.updateComment(commentId, commentText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', treeId, entityType, entityId] });
      setEditingComment(null);
      setEditText('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to update comment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => commentService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', treeId, entityType, entityId] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to delete comment');
    },
  });

  const handleSubmit = () => {
    const text = newComment.trim();
    if (!text) return;
    createMutation.mutate(text);
  };

  const handleEdit = (comment: Comment) => {
    setEditingComment(comment);
    setEditText(comment.commentText);
  };

  const handleSaveEdit = () => {
    const text = editText.trim();
    if (!text || !editingComment) return;
    updateMutation.mutate({ commentId: editingComment.commentId, commentText: text });
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditText('');
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <CommentItem
      comment={item}
      isOwner={item.userId === currentUserId}
      onEdit={handleEdit}
      onDelete={(id) => deleteMutation.mutate(id)}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>💬 Comments</Text>

      {editingComment ? (
        <View style={styles.editContainer}>
          <Text style={styles.editLabel}>Editing comment</Text>
          <TextInput
            style={styles.input}
            value={editText}
            onChangeText={setEditText}
            placeholder="Edit your comment..."
            multiline
            autoFocus
          />
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelEditButton} onPress={handleCancelEdit}>
              <Text style={styles.cancelEditText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, !editText.trim() && styles.buttonDisabled]}
              onPress={handleSaveEdit}
              disabled={!editText.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            multiline
          />
          <TouchableOpacity
            style={[styles.submitButton, !newComment.trim() && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!newComment.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
      ) : comments && comments.length > 0 ? (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.commentId}
          scrollEnabled={false}
          style={styles.commentsList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No comments yet. Be the first to comment!</Text>
        </View>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    maxHeight: 100,
    backgroundColor: '#f8f9fa',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  editContainer: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  cancelEditText: {
    color: '#666',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loader: {
    marginVertical: 20,
  },
  commentsList: {
    marginTop: 8,
  },
  commentItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    fontSize: 14,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#666',
  },
  editedLabel: {
    fontSize: 11,
    color: '#999',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  commentText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 4,
    backgroundColor: '#e9ecef',
  },
  actionButtonText: {
    fontSize: 13,
    color: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  deleteButtonText: {
    color: '#dc3545',
  },
  cancelButtonText: {
    fontSize: 13,
    color: '#666',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

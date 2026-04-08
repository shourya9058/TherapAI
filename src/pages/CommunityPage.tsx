"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  ThumbsUp,
  Heart,
  HandHeart,
  MessageCircle,
  CheckCircle,
  Plus,
  TrendingUp,
  Send,
  Award,
  Lightbulb,
  Bookmark,
  Flag,
  Users,
  Clock,
  Filter,
  Search,
  Sparkles,
  Eye,
  Share2,
  MoreVertical,
  Trash2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { showSuccess, showError, showLoading, dismissToast } from "../utils/toast"
import { getUserAvatar, getAvatarName } from "../utils/avatarUtils"
import LoadingSpinner from '../components/LoadingSpinner';
import { DeleteConfirmModal } from '../components/LoadingSpinner';
import { useAuth } from "../contexts/AuthContext";

interface PostReactions {
  like: number
  love: number
  support: number
  celebrate: number
  insightful: number
}

interface PostComment {
  _id: string
  author: { _id: string; username: string }
  content: string
  createdAt: string
  avatar?: string
}

interface Post {
  _id: string
  author: { _id: string; username: string }
  content: string
  category: string
  likes: string[]
  reactions: PostReactions
  comments: PostComment[]
  resolved: boolean
  views: number
  createdAt: string
  userReaction: string | null
  isSaved: boolean
  avatar?: string
  authorAvatarName?: string
}

const normalizePost = (post: any): Post => ({
  _id: post._id,
  author: post.author || { _id: "", username: "Anonymous" },
  content: post.content || "",
  category: post.category || "General",
  likes: post.likes || [],
  reactions: {
    like: post.reactions?.like || 0,
    love: post.reactions?.love || 0,
    support: post.reactions?.support || 0,
    celebrate: post.reactions?.celebrate || 0,
    insightful: post.reactions?.insightful || 0,
  },
  comments: post.comments || [],
  resolved: post.resolved || false,
  views: post.views || 0,
  createdAt: post.createdAt || new Date().toISOString(),
  userReaction: post.userReaction || null,
  isSaved: post.isSaved || false,
  avatar: post.avatar,
  authorAvatarName: post.authorAvatarName,
})

export default function CommunityPage() {
  const { user } = useAuth();

  // Debug: Log user object to see its structure
  useEffect(() => {
    console.log('Auth user object:', user);
    console.log('Username:', user?.username);
    console.log('User ID:', user?._id);
  }, [user]);

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("recent")
  const [searchQuery, setSearchQuery] = useState("")
  const [newPost, setNewPost] = useState({ content: "", category: "" })
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const [showReactions, setShowReactions] = useState<string | null>(null)
  const [activeReactions, setActiveReactions] = useState<Record<string, string>>({})
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({})
  const [showCommentBox, setShowCommentBox] = useState<Record<string, boolean>>({})
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>(getUserAvatar(user?.avatar))
  const [currentAvatarName, setCurrentAvatarName] = useState<string>(getAvatarName(user?.avatar))
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<string | null>(null)

  const categories = [
    { name: "all", icon: "🌐" },
    { name: "Mental Health", icon: "🧠" },
    { name: "Support", icon: "🤝" },
    { name: "Stress", icon: "😌" },
    { name: "Relationships", icon: "💝" },
    { name: "Career", icon: "💼" },
    { name: "Wellness", icon: "🌿" },
  ]

  const reactionTypes = {
    like: { icon: <ThumbsUp className="w-5 h-5" />, label: "Like", color: "text-blue-500" },
    love: { icon: <Heart className="w-5 h-5" fill="currentColor" />, label: "Love", color: "text-red-500" },
    support: { icon: <HandHeart className="w-5 h-5" fill="currentColor" />, label: "Support", color: "text-amber-500" },
    celebrate: { icon: <Award className="w-5 h-5" />, label: "Celebrate", color: "text-purple-500" },
    insightful: {
      icon: <Lightbulb className="w-5 h-5" fill="currentColor" />,
      label: "Insightful",
      color: "text-yellow-500",
    },
  }

  useEffect(() => {
    const updatedAvatar = getUserAvatar(user?.avatar)
    const updatedAvatarName = getAvatarName(user?.avatar)

    if (updatedAvatar !== currentUserAvatar || updatedAvatarName !== currentAvatarName) {
      setCurrentUserAvatar(updatedAvatar)
      setCurrentAvatarName(updatedAvatarName)

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.author._id === "current-user" || post.author._id === user?._id
            ? { ...post, avatar: updatedAvatar, authorAvatarName: updatedAvatarName }
            : post,
        )
      )
    }
  }, [user?.avatar, currentUserAvatar, currentAvatarName])

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    setLoading(true)
    setError(null)

    try {
      const savedPosts = localStorage.getItem("communityPosts")
      const mockPosts: Post[] = savedPosts ? JSON.parse(savedPosts) : []

      if (mockPosts.length === 0) {
        const welcomePost = createWelcomePost()
        setPosts([welcomePost])
        localStorage.setItem("communityPosts", JSON.stringify([welcomePost]))
      } else {
        // Update existing posts with current user data
        const username = user?.username || user?.email?.split('@')[0] || "User"
        const userId = user?._id || "current-user"

        const updatedPosts = mockPosts.map((post) => {
          // Update posts created by current user
          if (post.author._id === "current-user" || post.author._id === userId) {
            return {
              ...post,
              author: { _id: userId, username: username },
              avatar: getUserAvatar(user?.avatar),
              authorAvatarName: getAvatarName(user?.avatar),
              // Also update comments by current user
              comments: post.comments.map((comment) =>
                comment.author._id === "current-user" || comment.author._id === userId
                  ? { ...comment, author: { _id: userId, username: username }, avatar: getUserAvatar(user?.avatar) }
                  : comment
              ),
            }
          }
          // Update comments by current user in other users' posts
          return {
            ...post,
            comments: post.comments.map((comment) =>
              comment.author._id === "current-user" || comment.author._id === userId
                ? { ...comment, author: { _id: userId, username: username }, avatar: getUserAvatar(user?.avatar) }
                : comment
            ),
          }
        })
        setPosts(updatedPosts)
        localStorage.setItem("communityPosts", JSON.stringify(updatedPosts))
      }
    } catch (error: any) {
      console.error("Failed to fetch posts:", error)
      setError(error.message || "Failed to load community posts.")
      showError(error.message || "Failed to load community posts.")
      setPosts([createWelcomePost()])
    } finally {
      setLoading(false)
    }
  }

  const createWelcomePost = (): Post => ({
    _id: "welcome-post",
    author: { _id: "therapai-team", username: "TherapAI Team" },
    content:
      "Welcome to the TherapAI Community! 🌟\n\nThis is a safe space where you can:\n• Share your thoughts and experiences\n• Support others on their wellness journey\n• Ask questions and get advice\n• Connect with like-minded individuals\n\nRemember: Be kind, be respectful, and be yourself. We're all here to grow together.",
    category: "Support",
    likes: [],
    reactions: { like: 0, love: 0, support: 0, celebrate: 0, insightful: 0 },
    comments: [],
    resolved: false,
    views: 0,
    createdAt: new Date().toISOString(),
    userReaction: null,
    isSaved: false,
  })

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.content.trim() || !newPost.category) return

    const loadingToast = showLoading("Creating post...")
    try {
      // Get username from user object with fallbacks
      const username = user?.username || user?.email?.split('@')[0] || "User"
      const userId = user?._id || "current-user"

      console.log('Creating post with username:', username, 'userId:', userId)

      const post: Post = {
        _id: Date.now().toString(),
        author: { _id: userId, username: username },
        content: newPost.content,
        category: newPost.category,
        likes: [],
        reactions: { like: 0, love: 0, support: 0, celebrate: 0, insightful: 0 },
        comments: [],
        resolved: false,
        views: 0,
        createdAt: new Date().toISOString(),
        userReaction: null,
        isSaved: false,
        avatar: currentUserAvatar,
        authorAvatarName: currentAvatarName,
      }

      const updatedPosts = [post, ...posts.filter((p) => p._id !== "welcome-post")]
      setPosts(updatedPosts)
      localStorage.setItem("communityPosts", JSON.stringify(updatedPosts))

      setNewPost({ content: "", category: "" })
      setShowNewPost(false)

      dismissToast(loadingToast)
      showSuccess("Post created successfully! 🎉")
    } catch (error) {
      console.error("Failed to create post:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create post"
      dismissToast(loadingToast)
      showError(errorMessage)
    }
  }

  const handleAddComment = async (postId: string) => {
    if (!newComments[postId]?.trim()) return

    try {
      // Get username from user object with fallbacks
      const username = user?.username || user?.email?.split('@')[0] || "User"
      const userId = user?._id || "current-user"

      console.log('Creating comment with username:', username, 'userId:', userId)

      const newComment: PostComment = {
        _id: Date.now().toString(),
        author: { _id: userId, username: username },
        content: newComments[postId],
        createdAt: new Date().toISOString(),
        avatar: currentUserAvatar,
      }

      const updatedPosts = posts.map((post) =>
        post._id === postId ? { ...post, comments: [...post.comments, newComment] } : post,
      )
      setPosts(updatedPosts)
      localStorage.setItem("communityPosts", JSON.stringify(updatedPosts))

      setNewComments((prev) => ({ ...prev, [postId]: "" }))

      showSuccess("Comment posted! 💬")
    } catch (error) {
      console.error("Failed to add comment:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to add comment"
      showError(errorMessage)
    }
  }

  const handleReaction = async (postId: string, reactionType: string) => {
    const currentReaction = activeReactions[postId]

    if (currentReaction === reactionType) {
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            const newReactions = { ...post.reactions }
            newReactions[reactionType as keyof PostReactions] = Math.max(
              0,
              newReactions[reactionType as keyof PostReactions] - 1,
            )
            return { ...post, reactions: newReactions, userReaction: null }
          }
          return post
        }),
      )

      setActiveReactions((prev) => {
        const newReactions = { ...prev }
        delete newReactions[postId]
        return newReactions
      })
    } else {
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            const newReactions = { ...post.reactions }

            if (currentReaction) {
              newReactions[currentReaction as keyof PostReactions] = Math.max(
                0,
                newReactions[currentReaction as keyof PostReactions] - 1,
              )
            }

            newReactions[reactionType as keyof PostReactions] = newReactions[reactionType as keyof PostReactions] + 1

            return { ...post, reactions: newReactions, userReaction: reactionType }
          }
          return post
        }),
      )

      setActiveReactions((prev) => ({ ...prev, [postId]: reactionType }))
    }

    setShowReactions(null)
    localStorage.setItem("communityPosts", JSON.stringify(posts))
  }

  const handleDeletePost = async (postId: string) => {
    const toastId = showLoading("Deleting post...")

    try {
      setIsDeleting((prev) => ({ ...prev, [postId]: true }))

      const updatedPosts = posts.filter((post) => post._id !== postId)

      if (updatedPosts.length === 0) {
        const welcomePost = createWelcomePost()
        setPosts([welcomePost])
        localStorage.setItem("communityPosts", JSON.stringify([welcomePost]))
      } else {
        setPosts(updatedPosts)
        localStorage.setItem("communityPosts", JSON.stringify(updatedPosts))
      }

      setShowReactions(null)
      setActiveReactions((prev) => {
        const newReactions = { ...prev }
        delete newReactions[postId]
        return newReactions
      })
      setSavedPosts((prev) => {
        const newSaved = { ...prev }
        delete newSaved[postId]
        return newSaved
      })

      dismissToast(toastId)
      showSuccess("Post deleted successfully! 🗑️")
    } catch (error: any) {
      console.error("Failed to delete post:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to delete post"
      dismissToast(toastId)
      showError(errorMessage)
    } finally {
      setIsDeleting((prev) => ({ ...prev, [postId]: false }))
    }
  }

  const handleDeleteClick = (postId: string) => {
    setPostToDelete(postId)
    setDeleteModalOpen(true)
    setShowReactions(null)
  }

  const confirmDelete = () => {
    if (postToDelete) {
      handleDeletePost(postToDelete)
    }
    setDeleteModalOpen(false)
    setPostToDelete(null)
  }

  const cancelDelete = () => {
    setDeleteModalOpen(false)
    setPostToDelete(null)
  }

  const handleMarkResolved = async (postId: string) => {
    const toastId = showLoading("Updating status...")

    try {
      const updatedPosts = posts.map((post) => (post._id === postId ? { ...post, resolved: !post.resolved } : post))
      setPosts(updatedPosts)
      localStorage.setItem("communityPosts", JSON.stringify(updatedPosts))

      setShowReactions(null)

      dismissToast(toastId)
      showSuccess("Post status updated! ✓")
    } catch (error: any) {
      console.error("Failed to mark as resolved:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to update status"
      dismissToast(toastId)
      showError(errorMessage)
    }
  }

  const handleSavePost = async (postId: string) => {
    const isSaved = savedPosts[postId]

    setSavedPosts((prev) => ({ ...prev, [postId]: !isSaved }))

    try {
      showSuccess(isSaved ? "Post unsaved" : "Post saved! 📌")
    } catch (error) {
      console.error("Failed to save post:", error)
      setSavedPosts((prev) => ({ ...prev, [postId]: isSaved }))
      showError("Failed to save post")
    }
  }

  const getTotalReactions = (reactions: PostReactions): number => {
    return Object.values(reactions).reduce((sum, count) => sum + count, 0)
  }

  const filteredPosts = posts
    .filter((post) => post && post.author && post.author.username)
    .filter((post) => selectedCategory === "all" || post.category === selectedCategory)
    .filter((post) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        post.content.toLowerCase().includes(query) ||
        post.author.username.toLowerCase().includes(query) ||
        post.category.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (sortBy === "popular") {
        return getTotalReactions(b.reactions) - getTotalReactions(a.reactions)
      }
      if (sortBy === "discussed") {
        return b.comments.length - a.comments.length
      }
      return 0
    })

  if (loading) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-white/80 backdrop-blur-sm z-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20 },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pt-20">
      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 sticky top-24"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900">Categories</h3>
              </div>
              <div className="space-y-2">
                {categories.map((category) => {
                  const count =
                    category.name === "all"
                      ? posts.filter((p) => p._id !== "welcome-post").length
                      : posts.filter((p) => p.category === category.name && p._id !== "welcome-post").length

                  return (
                    <button
                      key={category.name}
                      onClick={() => setSelectedCategory(category.name)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedCategory === category.name
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                      <span className="flex items-center space-x-2">
                        <span>{category.icon}</span>
                        <span>{category.name === "all" ? "All Posts" : category.name}</span>
                      </span>
                      <span
                        className={`text-xs ${selectedCategory === category.name ? "text-white/80" : "text-gray-400"}`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-6 space-y-4">
            {/* Header */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white rounded-2xl shadow-md border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Community
                  </h1>
                  <p className="text-gray-600 text-sm mt-1">Share, connect, and grow together</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowNewPost(!showNewPost)}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Post</span>
                </motion.button>
              </div>

              {/* Search and Filter */}
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <Filter className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                      {sortBy === "recent" ? "Recent" : sortBy === "popular" ? "Popular" : "Discussed"}
                    </span>
                  </button>

                  {showFilters && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden">
                      {[
                        { value: "recent", label: "Most Recent", icon: Clock },
                        { value: "popular", label: "Most Popular", icon: TrendingUp },
                        { value: "discussed", label: "Most Discussed", icon: MessageCircle },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value)
                            setShowFilters(false)
                          }}
                          className={`flex items-center w-full px-4 py-2.5 text-left text-sm transition-colors ${sortBy === option.value
                            ? "bg-emerald-50 text-emerald-600 font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                          <option.icon className="w-4 h-4 mr-2" />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* New Post Form */}
            <AnimatePresence>
              {showNewPost && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
                >
                  <form onSubmit={handleCreatePost}>
                    <div className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
                          <img
                            src={currentUserAvatar || "/placeholder.svg"}
                            alt="User"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/AvatarImages/PandaAvatar.png"
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={newPost.content}
                            onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                            placeholder="Share your thoughts..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                            rows={4}
                            required
                          />
                          <div className="flex items-center justify-between mt-4">
                            <select
                              value={newPost.category}
                              onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                              required
                            >
                              <option value="">Select Category</option>
                              {categories
                                .filter((c) => c.name !== "all")
                                .map((cat) => (
                                  <option key={cat.name} value={cat.name}>
                                    {cat.icon} {cat.name}
                                  </option>
                                ))}
                            </select>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => setShowNewPost(false)}
                                className="px-5 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-md transition-all font-semibold text-sm"
                              >
                                Post
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Posts List */}
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const totalReactions = getTotalReactions(post.reactions)
                const isTherapAITeam = post.author._id === "therapai-team";

                return (
                  <motion.div
                    key={post._id}
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    className={`bg-white rounded-2xl shadow-md border overflow-hidden hover:shadow-lg transition-all ${isTherapAITeam
                      ? "border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white"
                      : "border-gray-100"
                      }`}
                  >
                    <div className="p-6">
                      {/* Post Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3 flex-1">
                          {isTherapAITeam ? (
                            <div
                              className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 bg-gradient-to-br from-emerald-600 to-teal-700`}
                            >
                              {post.author?.username?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-md">
                              <img
                                src={post.avatar || currentUserAvatar || "/placeholder.svg"}
                                alt={post.author?.username || "User"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = "/AvatarImages/PandaAvatar.png"
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-bold text-gray-900">{post.author?.username || "Anonymous"}</p>
                              {isTherapAITeam && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Team
                                </span>
                              )}
                            </div>
                            <div className="flex items-center flex-wrap gap-2 mt-0.5">
                              <p className="text-xs text-gray-500">
                                {new Date(post.createdAt).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              <span className="text-gray-300">•</span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                {categories.find((c) => c.name === post.category)?.icon} {post.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isTherapAITeam && (
                          <div className="relative">
                            <button
                              onClick={() =>
                                setShowReactions(showReactions === `menu-${post._id}` ? null : `menu-${post._id}`)
                              }
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            {showReactions === `menu-${post._id}` && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden">
                                <button
                                  onClick={() => {
                                    handleSavePost(post._id)
                                    setShowReactions(null)
                                  }}
                                  className="flex items-center w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Bookmark
                                    className={`w-4 h-4 mr-2 ${savedPosts[post._id] ? "fill-current text-emerald-600" : ""}`}
                                  />
                                  {savedPosts[post._id] ? "Unsave" : "Save Post"}
                                </button>
                                <button
                                  onClick={() => {
                                    handleMarkResolved(post._id)
                                    setShowReactions(null)
                                  }}
                                  className="flex items-center w-full px-4 py-2.5 text-left text-sm text-emerald-600 hover:bg-emerald-50"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  {post.resolved ? "Mark as Unresolved" : "Mark as Resolved"}
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(post._id)}
                                  className="flex items-center w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                                  disabled={isDeleting[post._id]}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {isDeleting[post._id] ? "Deleting..." : "Delete Post"}
                                </button>
                                <button
                                  onClick={() => setShowReactions(null)}
                                  className="flex items-center w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Flag className="w-4 h-4 mr-2" />
                                  Report
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Post Content */}
                      <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">{post.content}</p>

                      {/* Post Stats */}
                      {(totalReactions > 0 || post.comments.length > 0 || post.views > 0) && (
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
                          {totalReactions > 0 && (
                            <span className="font-medium">
                              {totalReactions} {totalReactions === 1 ? "reaction" : "reactions"}
                            </span>
                          )}
                          {post.comments.length > 0 && (
                            <span>
                              {post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}
                            </span>
                          )}
                          {post.views > 0 && (
                            <span className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              {post.views}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {/* Reaction Button */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setShowReactions(showReactions === `react-${post._id}` ? null : `react-${post._id}`)
                              }
                              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeReactions[post._id]
                                ? `${reactionTypes[activeReactions[post._id] as keyof typeof reactionTypes].color} bg-gray-50`
                                : "text-gray-600 hover:bg-gray-50"
                                }`}
                            >
                              {activeReactions[post._id] ? (
                                <>
                                  {reactionTypes[activeReactions[post._id] as keyof typeof reactionTypes].icon}
                                  <span>
                                    {reactionTypes[activeReactions[post._id] as keyof typeof reactionTypes].label}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <ThumbsUp className="w-4 h-4" />
                                  <span>React</span>
                                </>
                              )}
                            </button>

                            <AnimatePresence>
                              {showReactions === `react-${post._id}` && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                  className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl p-2 flex space-x-1 border border-gray-200 z-10"
                                >
                                  {Object.entries(reactionTypes).map(([type, { icon, label, color }]) => (
                                    <motion.button
                                      key={type}
                                      whileHover={{ scale: 1.3, y: -8 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => handleReaction(post._id, type)}
                                      className={`p-2 rounded-xl hover:bg-gray-50 transition-colors ${color}`}
                                      title={label}
                                    >
                                      {icon}
                                    </motion.button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Comment Button */}
                          <button
                            onClick={() =>
                              setShowCommentBox((prev) => ({
                                ...prev,
                                [post._id]: !prev[post._id],
                              }))
                            }
                            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Comment</span>
                          </button>

                          {/* Share Button */}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.href)
                              showSuccess("Link copied to clipboard! 📋")
                            }}
                            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                          >
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Share</span>
                          </button>
                        </div>

                        {/* Save Button */}
                        {!isTherapAITeam && (
                          <button
                            onClick={() => handleSavePost(post._id)}
                            className={`p-2 rounded-xl transition-colors ${savedPosts[post._id] ? "text-emerald-600 bg-emerald-50" : "text-gray-600 hover:bg-gray-50"
                              }`}
                          >
                            <Bookmark className={`w-5 h-5 ${savedPosts[post._id] ? "fill-current" : ""}`} />
                          </button>
                        )}
                      </div>

                      {/* Comments Section */}
                      <AnimatePresence>
                        {(showCommentBox[post._id] || post.comments.length > 0) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-gray-100"
                          >
                            {/* Existing Comments */}
                            {post.comments.length > 0 && (
                              <div className="space-y-3 mb-4">
                                {post.comments.map((comment) => (
                                  <div key={comment._id} className="flex space-x-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white shadow-sm">
                                      <img
                                        src={comment.avatar || "/AvatarImages/PandaAvatar.png"}
                                        alt={comment.author?.username || "User"}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.src = "/AvatarImages/PandaAvatar.png"
                                        }}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="bg-gray-50 rounded-xl px-4 py-2.5">
                                        <p className="text-sm font-semibold text-gray-900">
                                          {comment.author?.username || "Anonymous"}
                                        </p>
                                        <p className="text-sm text-gray-700 mt-0.5">{comment.content}</p>
                                      </div>
                                      <p className="text-xs text-gray-400 mt-1 px-2">
                                        {new Date(comment.createdAt).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Comment Input */}
                            {showCommentBox[post._id] && (
                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white shadow-sm">
                                  <img
                                    src={currentUserAvatar || "/placeholder.svg"}
                                    alt="User"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.src = "/AvatarImages/PandaAvatar.png"
                                    }}
                                  />
                                </div>
                                <div className="flex-1 flex bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent">
                                  <input
                                    type="text"
                                    value={newComments[post._id] || ""}
                                    onChange={(e) =>
                                      setNewComments({
                                        ...newComments,
                                        [post._id]: e.target.value,
                                      })
                                    }
                                    onKeyPress={(e) => {
                                      if (e.key === "Enter" && newComments[post._id]?.trim()) {
                                        handleAddComment(post._id)
                                      }
                                    }}
                                    placeholder="Write a comment..."
                                    className="flex-1 px-4 py-2.5 bg-transparent border-0 focus:ring-0 text-sm text-gray-800 placeholder-gray-500"
                                  />
                                  <button
                                    onClick={() => handleAddComment(post._id)}
                                    disabled={!newComments[post._id]?.trim()}
                                    className={`px-4 flex items-center justify-center transition-colors ${newComments[post._id]?.trim()
                                      ? "text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                      : "text-gray-400 cursor-not-allowed"
                                      }`}
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })}

              {/* Empty State */}
              {filteredPosts.length === 0 && !error && (
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  className="bg-white rounded-2xl shadow-md border border-gray-100 p-12 text-center"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No posts found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery ? "Try adjusting your search terms" : "Be the first to share something!"}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setShowNewPost(true)}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                    >
                      Create Post
                    </button>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-3">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-md p-6 text-white sticky top-24"
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">Community Guidelines</h3>
              </div>
              <ul className="space-y-2.5 text-emerald-50 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Be kind and respectful to everyone</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Keep personal information private</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>No spam or promotional content</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Mark posts resolved when answered</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Report inappropriate content</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
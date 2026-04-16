import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MobileShell from './components/MobileShell'
import PostCheckoutScreen from './screens/PostCheckoutScreen'
import ReviewLandingScreen from './screens/ReviewLandingScreen'
import TextReviewFlow from './screens/TextReviewFlow'
import VoiceScreen from './screens/VoiceScreen'
import OwnerDashboard from './screens/OwnerDashboard'
import PointsAwardedScreen from './screens/scout/PointsAwardedScreen'
import TopicPickerScreen from './screens/scout/TopicPickerScreen'
import QuestionScreen from './screens/scout/QuestionScreen'
import PayoffScreen from './screens/scout/PayoffScreen'
import HotelReviewsPage from './screens/HotelReviewsPage'
import AdminDashboard from './screens/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <MobileShell>
        <Routes>
          <Route path="/" element={<PostCheckoutScreen />} />
          <Route path="/review" element={<ReviewLandingScreen />} />
          {/* Screen 2 — Regular Review (replaces old TextReviewFlow) */}
          <Route path="/review/text" element={<TextReviewFlow />} />
          <Route path="/review/voice" element={<VoiceScreen />} />
          <Route path="/dashboard" element={<OwnerDashboard />} />
          <Route path="/hotel/reviews" element={<HotelReviewsPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* Scout game flow */}
          <Route path="/review/text/points" element={<PointsAwardedScreen />} />
          <Route path="/review/text/topics" element={<TopicPickerScreen />} />
          <Route path="/review/text/question" element={<QuestionScreen />} />
          <Route path="/review/text/payoff" element={<PayoffScreen />} />
        </Routes>
      </MobileShell>
    </BrowserRouter>
  )
}

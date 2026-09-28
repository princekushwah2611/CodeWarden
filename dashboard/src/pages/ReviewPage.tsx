import React from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { ReviewDetail } from '../components/review/ReviewDetail';
import { useApi } from '../hooks/useApi';
import { fetchReview } from '../lib/api';
import { Loader2 } from 'lucide-react';

const ReviewPage: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const { data: review, loading, error } = useApi(() => fetchReview(reviewId!), [reviewId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load review details.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ReviewDetail review={review} />
    </div>
  );
};

export default ReviewPage;

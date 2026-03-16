/**
 * Analytics Page
 * Personal analytics dashboard showing user viewing patterns and engagement metrics
 */

import React, { useEffect, useState } from 'react';
import {
    BarChart3,
    PieChart,
    TrendingUp,
    Clock,
    Target,
    Calendar,
    Film,
    Tv,
    PlayCircle,
    ArrowLeft,
    Loader2,
    Activity,
    Zap,
    Star
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import {
    getAllAnalytics,
    type EngagementStats,
    type GenreDistribution,
    type InteractionTrend,
    type MediaTypeDistribution,
    type ActiveHour,
    type SessionStats,
    type TopGenre
} from '../utils/analytics';

// Color palette for charts
const COLORS = [
    '#f59e0b', // amber-500
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#f97316', // orange-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
];

interface AnalyticsData {
    engagement: EngagementStats;
    genres: GenreDistribution[];
    trends: InteractionTrend[];
    mediaTypes: MediaTypeDistribution[];
    activeHours: ActiveHour[];
    acceptanceRate: number;
    sessions: SessionStats;
    topGenres: TopGenre[];
}

function AnalyticsPage() {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            loadAnalytics();
        }
    }, [user?.id]);

    const loadAnalytics = async () => {
        if (!user?.id) {
            setIsLoading(false);
            setAnalytics(getEmptyAnalyticsData());
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Add timeout to prevent infinite loading
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), 10000)
            );

            const analyticsPromise = getAllAnalytics(user.id);

            let data: AnalyticsData;
            try {
                data = await Promise.race([analyticsPromise, timeoutPromise]);
            } catch (raceError) {
                // Timeout or race error - use empty data
                console.warn('Analytics load timed out or failed, using empty data');
                data = getEmptyAnalyticsData();
            }

            setAnalytics(data);
            setError(null); // Clear any previous errors
        } catch (err) {
            console.error('Failed to load analytics:', err);
            // Show a more helpful message
            setError('No analytics data yet. Start exploring movies to see your stats!');
            // Still set empty data so page displays
            setAnalytics(getEmptyAnalyticsData());
        } finally {
            setIsLoading(false);
        }
    };

    // Empty data fallback
    function getEmptyAnalyticsData(): AnalyticsData {
        return {
            engagement: {
                totalInteractions: 0,
                uniqueMediaViewed: 0,
                searchesPerformed: 0,
                recommendationsAccepted: 0,
                recommendationsDismissed: 0,
                acceptanceRate: 0
            },
            genres: [],
            trends: [],
            mediaTypes: [],
            activeHours: [],
            acceptanceRate: 0,
            sessions: {
                totalSessions: 0,
                averageDuration: 0,
                sessionsPerWeek: 0,
                lastSessionDate: null
            },
            topGenres: []
        };
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-cinema-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-gold-600 animate-spin mx-auto mb-4" />
                    <p className="text-cream-300">Loading your analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-cinema-950 flex items-center justify-center">
                <Card className="p-8 max-w-md text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <Button onClick={loadAnalytics}>Try Again</Button>
                </Card>
            </div>
        );
    }

    if (!analytics) {
        return null;
    }

    const { engagement, genres, trends, mediaTypes, activeHours, acceptanceRate, sessions, topGenres } = analytics;

    return (
        <div className="min-h-screen bg-cinema-950 text-cream-100">
            {/* Header */}
            <div className="bg-cinema-900/50 border-b border-cinema-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-4">
                        <a
                            href="/"
                            className="p-2 rounded-lg bg-cinema-800 hover:bg-cinema-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-cream-300" />
                        </a>
                        <div>
                            <h1 className="text-2xl font-display font-bold text-cream-100">
                                Your Analytics
                            </h1>
                            <p className="text-cream-400 text-sm mt-1">
                                Insights into your viewing patterns and preferences
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Key Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <MetricCard
                        icon={<Activity className="w-5 h-5" />}
                        label="Total Interactions"
                        value={engagement.totalInteractions.toLocaleString()}
                        color="amber"
                    />
                    <MetricCard
                        icon={<Film className="w-5 h-5" />}
                        label="Unique Media Viewed"
                        value={engagement.uniqueMediaViewed.toLocaleString()}
                        color="blue"
                    />
                    <MetricCard
                        icon={<TrendingUp className="w-5 h-5" />}
                        label="Searches Performed"
                        value={engagement.searchesPerformed.toLocaleString()}
                        color="emerald"
                    />
                    <MetricCard
                        icon={<Target className="w-5 h-5" />}
                        label="Acceptance Rate"
                        value={`${acceptanceRate}%`}
                        color="violet"
                    />
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Genre Distribution */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <PieChart className="w-5 h-5 text-gold-500" />
                            <h2 className="text-lg font-semibold text-cream-100">Genre Distribution</h2>
                        </div>
                        {genres.length > 0 ? (
                            <div className="flex items-center gap-6">
                                {/* Pie Chart */}
                                <div className="relative w-32 h-32 flex-shrink-0">
                                    <PieChartComponent data={genres} />
                                </div>
                                {/* Legend */}
                                <div className="flex-1 space-y-2">
                                    {genres.slice(0, 5).map((genre, index) => (
                                        <div key={genre.genre} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                />
                                                <span className="text-cream-300 text-sm capitalize">{genre.genre}</span>
                                            </div>
                                            <span className="text-cream-400 text-sm">{genre.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-cream-400 text-center py-8">No genre data yet</p>
                        )}
                    </Card>

                    {/* Media Type Distribution */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Film className="w-5 h-5 text-gold-500" />
                            <h2 className="text-lg font-semibold text-cream-100">Media Type Distribution</h2>
                        </div>
                        {mediaTypes.length > 0 ? (
                            <div className="flex items-center gap-6">
                                <div className="relative w-32 h-32 flex-shrink-0">
                                    <PieChartComponent
                                        data={mediaTypes.map(m => ({
                                            genre: m.type,
                                            count: m.count,
                                            percentage: m.percentage
                                        }))}
                                    />
                                </div>
                                <div className="space-y-3 flex-1">
                                    {mediaTypes.map((media) => (
                                        <div key={media.type} className="flex items-center gap-3">
                                            {media.type === 'movie' && <Film className="w-4 h-4 text-blue-400" />}
                                            {media.type === 'tv' && <Tv className="w-4 h-4 text-purple-400" />}
                                            {media.type === 'anime' && <PlayCircle className="w-4 h-4 text-pink-400" />}
                                            <span className="text-cream-300 capitalize w-16">{media.type}</span>
                                            <div className="flex-1 h-2 bg-cinema-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gold-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${media.percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-cream-400 text-sm w-10 text-right">{media.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-cream-400 text-center py-8">No media type data yet</p>
                        )}
                    </Card>

                    {/* Activity Timeline */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-5 h-5 text-gold-500" />
                            <h2 className="text-lg font-semibold text-cream-100">Activity Timeline</h2>
                        </div>
                        {trends.length > 0 && trends.some(t => t.count > 0) ? (
                            <div className="h-40 flex items-end gap-1">
                                {trends.slice(-14).map((trend, index) => {
                                    const maxCount = Math.max(...trends.map(t => t.count), 1);
                                    const height = Math.max((trend.count / maxCount) * 100, 2);
                                    const date = new Date(trend.date);
                                    const isToday = index === trends.slice(-14).length - 1;

                                    return (
                                        <div
                                            key={trend.date}
                                            className="flex-1 flex flex-col items-center gap-1"
                                        >
                                            <div
                                                className={`w-full rounded-t transition-all duration-300 ${isToday ? 'bg-gold-500' : 'bg-gold-600/60 hover:bg-gold-500'}`}
                                                style={{ height: `${height}%` }}
                                                title={`${trend.count} interactions on ${trend.date}`}
                                            />
                                            <span className={`text-[10px] ${isToday ? 'text-gold-400' : 'text-cream-500'}`}>
                                                {date.getDate()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-cream-400 text-center py-8">No activity data yet</p>
                        )}
                        <p className="text-cream-500 text-xs mt-2 text-center">Last 14 days</p>
                    </Card>

                    {/* Active Hours Heatmap */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-5 h-5 text-gold-500" />
                            <h2 className="text-lg font-semibold text-cream-100">Active Hours</h2>
                        </div>
                        {activeHours.some(h => h.count > 0) ? (
                            <div className="grid grid-cols-8 gap-1">
                                {activeHours.map((hour) => {
                                    const maxCount = Math.max(...activeHours.map(h => h.count), 1);
                                    const intensity = hour.count / maxCount;

                                    return (
                                        <div
                                            key={hour.hour}
                                            className="aspect-square rounded-sm transition-all duration-300"
                                            style={{
                                                backgroundColor: intensity > 0
                                                    ? `rgba(245, 158, 11, ${0.1 + intensity * 0.9})`
                                                    : 'rgba(55, 65, 81, 0.5)',
                                            }}
                                            title={`${hour.hour}:00 - ${hour.count} interactions`}
                                        />
                                    );
                                })}
                                <div className="col-span-8 flex justify-between mt-2 text-[10px] text-cream-500">
                                    <span>12AM</span>
                                    <span>6AM</span>
                                    <span>12PM</span>
                                    <span>6PM</span>
                                    <span>11PM</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-cream-400 text-center py-8">No active hours data yet</p>
                        )}
                    </Card>

                    {/* Session Stats */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5 text-gold-500" />
                            <h2 className="text-lg font-semibold text-cream-100">Session Statistics</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-cinema-800/50 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-gold-500">{sessions.totalSessions}</p>
                                <p className="text-cream-400 text-sm">Total Sessions</p>
                            </div>
                            <div className="bg-cinema-800/50 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-gold-500">{sessions.sessionsPerWeek}</p>
                                <p className="text-cream-400 text-sm">Sessions/Week</p>
                            </div>
                            <div className="bg-cinema-800/50 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-gold-500">{sessions.averageDuration}</p>
                                <p className="text-cream-400 text-sm">Avg Duration (min)</p>
                            </div>
                            <div className="bg-cinema-800/50 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-gold-500">{engagement.recommendationsAccepted}</p>
                                <p className="text-cream-400 text-sm">Accepted</p>
                            </div>
                        </div>
                    </Card>

                    {/* Top Genres */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="w-5 h-5 text-gold-500" />
                            <h2 className="text-lg font-semibold text-cream-100">Top Genres</h2>
                        </div>
                        {topGenres.length > 0 ? (
                            <div className="space-y-3">
                                {topGenres.map((genre) => (
                                    <div key={genre.genre} className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-gold-600/20 text-gold-500 flex items-center justify-center text-sm font-medium">
                                            {genre.rank}
                                        </span>
                                        <span className="flex-1 text-cream-200 capitalize">{genre.genre}</span>
                                        <div className="w-24 h-2 bg-cinema-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gold-500 rounded-full"
                                                style={{ width: `${Math.min(genre.score, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-cream-400 text-sm w-12 text-right">{genre.score}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-cream-400 text-center py-8">No top genres data yet</p>
                        )}
                    </Card>
                </div>

                {/* Recommendation Acceptance */}
                <Card className="p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-gold-500" />
                        <h2 className="text-lg font-semibold text-cream-100">Recommendation Acceptance</h2>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    className="text-cinema-700"
                                />
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    strokeDasharray={`${acceptanceRate * 3.52} 352`}
                                    strokeLinecap="round"
                                    className="text-gold-500 transition-all duration-500"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-3xl font-bold text-gold-500">{acceptanceRate}%</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                                    <p className="text-2xl font-bold text-green-400">{engagement.recommendationsAccepted}</p>
                                    <p className="text-cream-400 text-sm">Accepted</p>
                                </div>
                                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                                    <p className="text-2xl font-bold text-red-400">{engagement.recommendationsDismissed}</p>
                                    <p className="text-cream-400 text-sm">Dismissed</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Empty State - When no data */}
                {engagement.totalInteractions === 0 && (
                    <Card className="p-8 text-center">
                        <Star className="w-16 h-16 text-gold-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-cream-100 mb-2">Start Your Journey</h3>
                        <p className="text-cream-400 mb-4">
                            Your analytics will appear here as you use the app.
                            Search for movies, add to watchlist, and interact with recommendations to see your patterns.
                        </p>
                        <a href="/">
                            <Button>Get Started</Button>
                        </a>
                    </Card>
                )}
            </div>
        </div>
    );
}

// Metric Card Component
interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: 'amber' | 'blue' | 'emerald' | 'violet';
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
    const colorClasses = {
        amber: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
        blue: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
        emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500',
        violet: 'bg-violet-500/10 border-violet-500/30 text-violet-500',
    };

    return (
        <Card className="p-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${colorClasses[color]}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-2xl font-bold text-cream-100">{value}</p>
                    <p className="text-cream-400 text-sm">{label}</p>
                </div>
            </div>
        </Card>
    );
}

// Pie Chart Component
interface PieChartComponentProps {
    data: { genre: string; count: number; percentage: number }[];
}

function PieChartComponent({ data }: PieChartComponentProps) {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    let cumulativePercentage = 0;

    if (total === 0) {
        return (
            <div className="w-full h-full rounded-full bg-cinema-700 flex items-center justify-center">
                <span className="text-cream-400 text-xs">No data</span>
            </div>
        );
    }

    return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
            {data.map((item, index) => {
                const startAngle = cumulativePercentage * 3.6; // Convert percentage to degrees
                cumulativePercentage += item.percentage;
                const endAngle = cumulativePercentage * 3.6;

                const startX = 50 + 40 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                const startY = 50 + 40 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                const endX = 50 + 40 * Math.cos((Math.PI * (endAngle - 90)) / 180);
                const endY = 50 + 40 * Math.sin((Math.PI * (endAngle - 90)) / 180);

                const largeArcFlag = item.percentage > 50 ? 1 : 0;

                return (
                    <path
                        key={item.genre}
                        d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth="1"
                    />
                );
            })}
            {/* Center hole for donut effect */}
            <circle cx="50" cy="50" r="25" fill="#1a1a2e" />
        </svg>
    );
}

export default AnalyticsPage;

'use client';

import React, { useState, useEffect } from 'react';
import MapboxMap from './MapboxMap';

interface TravelMapProps {
  itineraryData?: any;
}


type ItineraryDay = {
	day: number;
	activities: string[];
};

type MapModalProps = {
	show: boolean;
	onClose: () => void;
	itinerary: ItineraryDay[];
};

const MapModal: React.FC<MapModalProps & { points: any[]; itineraryData?: any }> = ({
	show,
	onClose,
	itinerary,
	points,
	itineraryData,
}) => {
	const [showMap, setShowMap] = useState(false);

	useEffect(() => {
		if (show) {
			// Delay map rendering to ensure modal is fully rendered
			const timer = setTimeout(() => setShowMap(true), 300);
			return () => clearTimeout(timer);
		} else {
			setShowMap(false);
		}
	}, [show]);

	if (!show) return null;
	
	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
			<div className="bg-white rounded-lg p-6 w-[80vw] h-[80vh] max-w-none shadow-lg flex flex-col">
				<h3 className="text-lg font-bold mb-4 text-[#FF2D00]">
					Full Itinerary Map
				</h3>
				<div className="mb-6 flex-1 bg-gray-100 rounded-lg" style={{ minHeight: '350px' }}>
					{showMap ? (
						<MapboxMap key="modal-map" showSearch={false} showDefaultMarker={false} itineraryData={itineraryData} />
					) : (
						<div className="flex items-center justify-center h-full text-gray-500">
							Loading map...
						</div>
					)}
				</div>
				<div className="space-y-4 overflow-y-auto max-h-[30vh]">
					{(() => {
						// Process itinerary data from the API response format
						const processedItinerary: Array<{
							dayKey: string;
							dayName: string;
							activities: any[];
						}> = [];
						
						if (itineraryData?.itinerary?.itinerary) {
							// Handle double nesting: finalResponse.itinerary.itinerary.day_1
							const dayData = itineraryData.itinerary.itinerary;
							Object.entries(dayData).forEach(([dayKey, activities]: [string, any]) => {
								if (Array.isArray(activities)) {
									processedItinerary.push({
										dayKey,
										dayName: dayKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
										activities
									});
								}
							});
						} else if (itineraryData?.itinerary) {
							// Handle single nesting
							const dayData = itineraryData.itinerary;
							if (typeof dayData === 'object' && !Array.isArray(dayData)) {
								Object.entries(dayData).forEach(([dayKey, activities]: [string, any]) => {
									if (Array.isArray(activities)) {
										processedItinerary.push({
											dayKey,
											dayName: dayKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
											activities
										});
									}
								});
							}
						}
						
						console.log('Modal processedItinerary:', processedItinerary);
						
						return processedItinerary.map((day: any) => (
							<div key={day.dayKey} className="mb-6">
								<h4 className="font-semibold text-[#FF2D00] mb-3">{day.dayName}</h4>
								<div className="space-y-3">
									{day.activities.map((activity: any, idx: number) => (
										<div key={idx} className="bg-gray-50 rounded-lg p-4">
											<div className="flex items-start space-x-3">
												<div className="flex-shrink-0 w-16 text-sm font-medium text-gray-600">
													{activity.time || `${9 + idx}:00`}
												</div>
												<div className="flex-1">
													<h5 className="font-medium text-gray-900 mb-1">
														{activity.place || activity.name || 'Activity'}
													</h5>
													{activity.description && (
														<p className="text-sm text-gray-600 mb-2">{activity.description}</p>
													)}
													<div className="flex items-center space-x-4 text-xs text-gray-500">
														{activity.duration && <span>⏱️ {activity.duration}</span>}
														{activity.cost && <span>💰 {activity.cost}</span>}
														{activity.type && <span>📍 {activity.type}</span>}
													</div>
													{activity.address && (
														<p className="text-xs text-gray-500 mt-1">📍 {activity.address}</p>
													)}
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						));
					})()}
				</div>
				<button
					onClick={onClose}
					className="mt-6 bg-[#FF2D00] text-white px-4 py-2 rounded hover:bg-white hover:text-[#FF2D00] border border-[#FF2D00] transition"
				>
					Close
				</button>
			</div>
		</div>
	);
};

const TravelMap: React.FC<TravelMapProps> = ({ itineraryData }) => {
	const [showModal, setShowModal] = useState(false);
	
	console.log('TravelMap received itineraryData:', itineraryData);
	console.log('TravelMap itineraryData.itinerary:', itineraryData?.itinerary);

	return (
		<div className="mt-8">
			<div className="bg-white rounded-2xl border px-6 py-5 flex flex-col items-center w-full">
				<h3 className="text-base font-semibold text-[#FF2D00] mb-2">
					Your Trip Map
				</h3>
				<MapboxMap showSearch={false} showDefaultMarker={false} itineraryData={itineraryData} />
				<button
					className="mt-4 bg-[#FF2D00] text-white px-4 py-2 rounded hover:bg-white hover:text-[#FF2D00] border border-[#FF2D00] transition"
					onClick={() => setShowModal(true)}
				>
					View Full Itinerary
				</button>
				<MapModal
					show={showModal}
					onClose={() => setShowModal(false)}
					itinerary={[]}
					points={[]}
					itineraryData={itineraryData}
				/>
			</div>
		</div>
	);
};

export default TravelMap;

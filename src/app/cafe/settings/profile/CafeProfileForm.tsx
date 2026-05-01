'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Save, 
  Upload, 
  Image as ImageIcon, 
  MapPin, 
  Clock, 
  Wifi, 
  Car, 
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';

interface CafeProfileData {
  logo_url: string | null;
  banner_url: string | null;
  tagline: string | null;
  description: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  area: string | null;
  google_maps_url: string | null;
  opening_hours: Record<string, { open: string; close: string; closed: boolean }> | null;
  has_wifi: boolean;
  has_parking: boolean;
  has_ac: boolean;
  daily_special_name: string | null;
  daily_special_price_cents: number | null;
  daily_special_active: boolean;
}

interface CafeProfileFormProps {
  cafeId: string;
  initialData: CafeProfileData | null;
  businessName: string;
}

type DayName = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type OpeningHours = Record<DayName, { open: string; close: string; closed: boolean }>;

const DAYS: DayName[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DEFAULT_HOURS = {
  monday: { open: '07:00', close: '21:00', closed: false },
  tuesday: { open: '07:00', close: '21:00', closed: false },
  wednesday: { open: '07:00', close: '21:00', closed: false },
  thursday: { open: '07:00', close: '21:00', closed: false },
  friday: { open: '07:00', close: '21:00', closed: false },
  saturday: { open: '07:00', close: '22:00', closed: false },
  sunday: { open: '08:00', close: '20:00', closed: false },
};

export default function CafeProfileForm({ cafeId, initialData, businessName }: CafeProfileFormProps) {
  const supabase = createClient();
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [tagline, setTagline] = useState(initialData?.tagline || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [addressLine1, setAddressLine1] = useState(initialData?.address_line1 || '');
  const [area, setArea] = useState(initialData?.area || '');
  const [city, setCity] = useState(initialData?.city || 'Kathmandu');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(initialData?.google_maps_url || '');
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    (initialData?.opening_hours as OpeningHours) || DEFAULT_HOURS
  );
  const [hasWifi, setHasWifi] = useState(initialData?.has_wifi || false);
  const [hasParking, setHasParking] = useState(initialData?.has_parking || false);
  const [hasAc, setHasAc] = useState(initialData?.has_ac || false);
  const [dailySpecialName, setDailySpecialName] = useState(initialData?.daily_special_name || '');
  const [dailySpecialPrice, setDailySpecialPrice] = useState(
    initialData?.daily_special_price_cents ? (initialData.daily_special_price_cents / 100).toString() : ''
  );
  const [dailySpecialActive, setDailySpecialActive] = useState(initialData?.daily_special_active || false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const { error: updateError } = await supabase
        .from('cafe_profiles')
        .upsert({
          cafe_id: cafeId,
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          address_line1: addressLine1.trim() || null,
          area: area.trim() || null,
          city: city.trim() || 'Kathmandu',
          google_maps_url: googleMapsUrl.trim() || null,
          opening_hours: openingHours,
          has_wifi: hasWifi,
          has_parking: hasParking,
          has_ac: hasAc,
          daily_special_name: dailySpecialName.trim() || null,
          daily_special_price_cents: dailySpecialPrice ? Math.round(parseFloat(dailySpecialPrice) * 100) : null,
          daily_special_active: dailySpecialActive,
          updated_at: new Date().toISOString(),
        });

      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const updateHours = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const slug = businessName.toLowerCase().replace(/\s+/g, '-');
  const previewUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${slug}`;

  return (
    <div className="space-y-8">
      {/* Preview Link */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
        <p className="text-sm text-stone-800">
          <strong>Your cafe website:</strong>{' '}
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {previewUrl}
          </a>
        </p>
      </div>

      {/* Branding Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g., Best momo in Baneshwor"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">Short catchy phrase shown under your cafe name</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell customers about your cafe..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
              maxLength={500}
            />
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-600" />
          Location
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Street address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g., Baneshwor, Thamel"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Kathmandu"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Maps Link
            </label>
            <input
              type="url"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
            />
          </div>
        </div>
      </section>

      {/* Opening Hours Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          Opening Hours
        </h2>
        
        <div className="space-y-3">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-24">
                <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
              </div>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!openingHours[day]?.closed}
                  onChange={(e) => updateHours(day, 'closed', !e.target.checked)}
                  className="rounded border-gray-300 text-stone-600 focus:ring-stone-500"
                />
                <span className="text-sm text-gray-600">Open</span>
              </label>

              {!openingHours[day]?.closed && (
                <>
                  <input
                    type="time"
                    value={openingHours[day]?.open || '07:00'}
                    onChange={(e) => updateHours(day, 'open', e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={openingHours[day]?.close || '21:00'}
                    onChange={(e) => updateHours(day, 'close', e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Features & Amenities</h2>
        
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={hasWifi}
              onChange={(e) => setHasWifi(e.target.checked)}
              className="rounded border-gray-300 text-stone-600 focus:ring-stone-500"
            />
            <Wifi className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">Free WiFi</span>
          </label>

          <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={hasParking}
              onChange={(e) => setHasParking(e.target.checked)}
              className="rounded border-gray-300 text-stone-600 focus:ring-stone-500"
            />
            <Car className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">Parking</span>
          </label>

          <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={hasAc}
              onChange={(e) => setHasAc(e.target.checked)}
              className="rounded border-gray-300 text-stone-600 focus:ring-stone-500"
            />
            <Sparkles className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">Air Conditioning</span>
          </label>
        </div>
      </section>

      {/* Daily Special Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-stone-400" />
            Today&apos;s Special
          </h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={dailySpecialActive}
              onChange={(e) => setDailySpecialActive(e.target.checked)}
              className="rounded border-gray-300 text-stone-600 focus:ring-stone-500"
            />
            <span className="text-sm font-medium text-gray-700">Show on website</span>
          </label>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Item Name
            </label>
            <input
              type="text"
              value={dailySpecialName}
              onChange={(e) => setDailySpecialName(e.target.value)}
              placeholder="e.g., Buff Momo Set"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Price (Rs)
            </label>
            <input
              type="number"
              value={dailySpecialPrice}
              onChange={(e) => setDailySpecialPrice(e.target.value)}
              placeholder="150"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
            />
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
        {error && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-5 h-5" />
            <span className="text-sm font-medium">Changes saved!</span>
          </div>
        )}
        {!error && !saved && <div />}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

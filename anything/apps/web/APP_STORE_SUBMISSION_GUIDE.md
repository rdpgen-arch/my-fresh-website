# Mobile App Store Submission Guide
## Google Play Store + Apple App Store

---

## 1. Set Your Bundle IDs (Do This First — Cannot Change Later)

### Android Bundle ID
In `/apps/mobile/app.json`, set:
```json
{
  "expo": {
    "android": {
      "package": "com.yourcompanyname.shopmanager"
    }
  }
}
```
**Convention:** `com.{yourcompanyname}.shopmanager`
Example: `com.techventurebd.shopmanager`

### iOS Bundle ID
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompanyname.shopmanager"
    }
  }
}
```
**Use the exact same value for both Android and iOS.**

⚠️ **WARNING:** Once submitted to the App Store, the iOS bundle ID can NEVER be changed.

---

## 2. Complete app.json Configuration

Replace `/apps/mobile/app.json` with:
```json
{
  "expo": {
    "name": "Shop Manager",
    "slug": "shop-manager",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.yourcompanyname.shopmanager",
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "Allow photo access to upload product images",
        "NSCameraUsageDescription": "Allow camera access to take product photos"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompanyname.shopmanager",
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA"
      ]
    },
    "extra": {
      "eas": {
        "projectId": "YOUR-EAS-PROJECT-ID"
      }
    },
    "owner": "YOUR-EXPO-USERNAME",
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow Shop Manager to upload product photos"
        }
      ]
    ]
  }
}
```

---

## 3. Firebase Setup (for google-services.json)

### 3.1 Create a Firebase Project
1. Go to https://console.firebase.google.com
2. "Add project" → name it "ShopManager"
3. Disable Google Analytics (not needed)

### 3.2 Add Android App
1. Click the Android icon (🤖) in your Firebase project
2. Android package name: `com.yourcompanyname.shopmanager`
3. App nickname: "Shop Manager Android"
4. Download `google-services.json`
5. Place it at: `/apps/mobile/google-services.json`

### 3.3 Add iOS App
1. Click the Apple icon (🍎)
2. iOS bundle ID: `com.yourcompanyname.shopmanager`
3. App nickname: "Shop Manager iOS"
4. Download `GoogleService-Info.plist`
5. Place it at: `/apps/mobile/GoogleService-Info.plist`

### 3.4 Reference them in app.json
```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

---

## 4. EAS Build Setup

### 4.1 Install EAS CLI
```bash
npm install -g eas-cli
```

### 4.2 Login to Expo
```bash
eas login
# Enter your Expo account credentials
```

### 4.3 Initialize EAS project
```bash
cd /apps/mobile
eas init
# This generates your EAS project ID — paste it into app.json extra.eas.projectId
```

### 4.4 Create eas.json
Create `/apps/mobile/eas.json`:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      },
      "ios": {
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      },
      "ios": {
        "appleId": "your.apple.id@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "XXXXXXXXXX"
      }
    }
  }
}
```

---

## 5. Google Play Store Submission

### 5.1 Create Play Console Account
1. Go to https://play.google.com/console
2. Pay $25 one-time fee
3. Complete the account setup (takes 1-2 days for verification)

### 5.2 Create the app in Play Console
1. All apps → Create app
2. App name: "Shop Manager"
3. Default language: Bangla (Bangladesh) + English
4. App type: App
5. Free/Paid: Free (you're billing clients separately)
6. Accept policies

### 5.3 Generate Service Account for automated submission
1. Play Console → Setup → API access
2. Link to a Google Cloud project
3. Create Service Account → give it "Release manager" role
4. Download JSON key → save as `/apps/mobile/google-service-account.json`

### 5.4 Build for Play Store
```bash
cd /apps/mobile
eas build --platform android --profile production
```
This takes 10-20 minutes on EAS servers. Download the `.aab` file.

### 5.5 Submit to Play Store
```bash
eas submit --platform android --profile production
```
OR manually upload the `.aab` in Play Console → Production → Create release.

### 5.6 Required store listing items (before publishing):
- ✅ App name: "Shop Manager"
- ✅ Short description (80 chars): "Manage orders, products & sales from your phone"
- ✅ Full description (4000 chars): Describe what the app does
- ✅ App icon: 512×512 PNG
- ✅ Feature graphic: 1024×500 PNG
- ✅ Screenshots: minimum 2, recommended 4-8 (phone + tablet)
- ✅ Privacy policy URL: a simple hosted page (required!)
- ✅ Content rating: complete the questionnaire

**Review time:** 2-7 days for first submission.

---

## 6. Apple App Store Submission

### 6.1 Create Apple Developer Account
1. Go to https://developer.apple.com
2. Enroll → Individual or Organization → $99/year
3. Wait 1-2 days for approval

### 6.2 Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Apps → + → New App
3. Platform: iOS
4. Name: "Shop Manager"
5. Bundle ID: Select your registered bundle ID (or add it if not listed)
6. SKU: any unique string (e.g. `shopmanager-bd-001`)
7. Note the **App ID (ascAppId)** — a 10-digit number

### 6.3 Find your Apple credentials
- **Apple ID**: your@email.com (Apple Developer account email)
- **Apple Team ID**: developer.apple.com → Account → Membership → Team ID (10 chars like `AB12CD34EF`)
- **App Store Connect App ID (ascAppId)**: App Store Connect → App → General → Apple ID

### 6.4 Build for App Store
```bash
cd /apps/mobile
eas build --platform ios --profile production
```

### 6.5 Submit to App Store
```bash
eas submit --platform ios --profile production
```

### 6.6 Required App Store listing items:
- ✅ App name: "Shop Manager"
- ✅ Subtitle: "Orders · Products · Sales"
- ✅ Description: full description (4000 chars)
- ✅ Keywords: comma-separated (affects search)
- ✅ Support URL: your website or email
- ✅ Marketing URL (optional)
- ✅ Privacy Policy URL: **required by Apple**
- ✅ Screenshots: Required for each device type used in screenshots
  - 6.7" iPhone (iPhone 14 Pro Max)
  - 5.5" iPhone (iPhone 8 Plus)
  - iPad Pro 12.9" (if supporting tablets)
- ✅ App icon: 1024×1024 PNG (no alpha channel)
- ✅ Age rating: complete questionnaire
- ✅ Category: Business or Shopping

**Review time:** 1-7 days (usually 24-48 hours).

---

## 7. Privacy Policy (Required by Both Stores)

Create a simple HTML page hosted at `https://yourdomain.com/privacy` with:

```html
<h1>Privacy Policy — Shop Manager</h1>
<p>Last updated: [date]</p>
<p>Shop Manager collects the following data to provide the service:</p>
<ul>
  <li>Account email address</li>
  <li>Order and product data specific to your store</li>
  <li>Photos you upload for products</li>
</ul>
<p>We do not sell your data. Data is stored securely on our servers.</p>
<p>Contact: your@email.com</p>
```

Or use a free generator like https://www.privacypolicygenerator.info

---

## 8. App Updates

After the initial submission, updates are simpler:

```bash
# Build new version
eas build --platform all --profile production

# Submit new version
eas submit --platform all --profile production
```

For small JavaScript-only changes, you can use Expo's OTA update system (no app store review needed):
```bash
eas update --branch production --message "Fix order status display"
```

---

## 9. Summary Checklist

### Before first build:
- [ ] Set bundle ID in app.json (android.package + ios.bundleIdentifier)
- [ ] Create Firebase project + download google-services.json and GoogleService-Info.plist
- [ ] Run `eas init` to get your EAS project ID
- [ ] Create eas.json with correct credentials

### For Play Store:
- [ ] Create Play Console account ($25 one-time)
- [ ] Create app listing with screenshots + description
- [ ] Create service account + download JSON key
- [ ] `eas build --platform android --profile production`
- [ ] `eas submit --platform android`

### For App Store:
- [ ] Create Apple Developer account ($99/year)
- [ ] Create app in App Store Connect
- [ ] Find your Apple ID, Team ID, App ID
- [ ] Create privacy policy URL
- [ ] `eas build --platform ios --profile production`
- [ ] `eas submit --platform ios`

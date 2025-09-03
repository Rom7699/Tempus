// services/HealthDataService.ts
import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
  HealthInputOptions,
} from 'react-native-health';
import { Alert } from 'react-native';

// Type definitions for our health data structure
interface SleepSample {
  id: string;
  startDate: string;
  endDate: string;
  value: 'INBED' | 'ASLEEP' | 'DEEP' | 'CORE' | 'REM';
}

interface HeartRateSample {
  id: string;
  value: number;
  startDate: string;
  endDate: string;
  metadata?: {
    HKWasUserEntered: boolean;
  };
}

interface StepSample {
  startDate: string;
  endDate: string;
  value: number;
  metadata?: Array<{
    sourceId: string;
    sourceName: string;
    quantity: number;
  }>;
}

interface DailyHealthData {
  sleep: SleepSample[];
  heartRate: HeartRateSample[];
  restingHeartRate: HeartRateSample[];
  steps: {
    total: number;
    samples: StepSample[];
  };
}

interface HealthDataJSON {
  metadata: {
    generatedAt: string;
    platform: string;
    timezone: string;
    dataRange: {
      startDate: string;
      endDate: string;
    };
  };
  userId: string;
  dailyData: Record<string, DailyHealthData>;
}

export class HealthDataService {
  private static instance: HealthDataService;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): HealthDataService {
    if (!HealthDataService.instance) {
      HealthDataService.instance = new HealthDataService();
    }
    return HealthDataService.instance;
  }

  /**
   * Initialize HealthKit with required permissions
   */
  public async initializeHealthKit(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const permissions: HealthKitPermissions = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.HeartRate,
            AppleHealthKit.Constants.Permissions.RestingHeartRate,
            AppleHealthKit.Constants.Permissions.SleepAnalysis,
            AppleHealthKit.Constants.Permissions.Steps,
            AppleHealthKit.Constants.Permissions.StepCount,
          ],
          write: [], // We're only reading data
        },
      };

      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.error('[HealthDataService] Cannot grant permissions:', error);
          Alert.alert(
            'Health Permissions Required',
            'Please grant health data permissions in Settings to use this feature.'
          );
          reject(new Error(error));
          return;
        }

        console.log('[HealthDataService] HealthKit initialized successfully');
        this.isInitialized = true;
        resolve(true);
      });
    });
  }

  /**
   * Fetch sleep samples for a date range
   */
  private async fetchSleepData(startDate: Date, endDate: Date): Promise<SleepSample[]> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: true,
      };

      AppleHealthKit.getSleepSamples(
        options,
        (error: string, results: HealthValue[]) => {
          if (error) {
            console.error('[HealthDataService] Error fetching sleep data:', error);
            reject(new Error(error));
            return;
          }

          const sleepSamples: SleepSample[] = results.map((sample: any) => ({
            id: sample.id,
            startDate: sample.startDate,
            endDate: sample.endDate,
            value: sample.value,
          }));

          resolve(sleepSamples);
        }
      );
    });
  }

  /**
   * Fetch heart rate samples for a date range
   */
  private async fetchHeartRateData(startDate: Date, endDate: Date): Promise<HeartRateSample[]> {
    return new Promise((resolve, reject) => {
      const options = {
        unit: AppleHealthKit.Constants.Units.bpm,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: true,
      };

      AppleHealthKit.getHeartRateSamples(
        options,
        (error: string, results: HealthValue[]) => {
          if (error) {
            console.error('[HealthDataService] Error fetching heart rate data:', error);
            reject(new Error(error));
            return;
          }

          const heartRateSamples: HeartRateSample[] = results.map((sample: any) => ({
            id: sample.id,
            value: sample.value,
            startDate: sample.startDate,
            endDate: sample.endDate,
            metadata: sample.metadata,
          }));

          resolve(heartRateSamples);
        }
      );
    });
  }

  /**
   * Fetch resting heart rate samples for a date range
   */
  private async fetchRestingHeartRateData(startDate: Date, endDate: Date): Promise<HeartRateSample[]> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: true,
        unit: AppleHealthKit.Constants.Units.bpm,
      };

      AppleHealthKit.getRestingHeartRateSamples(
        options,
        (error: string, results: HealthValue[]) => {
          if (error) {
            console.error('[HealthDataService] Error fetching resting heart rate:', error);
            reject(new Error(error));
            return;
          }

          const restingHeartRateSamples: HeartRateSample[] = results.map((sample: any) => ({
            id: sample.id,
            value: sample.value,
            startDate: sample.startDate,
            endDate: sample.endDate,
            metadata: sample.metadata,
          }));

          resolve(restingHeartRateSamples);
        }
      );
    });
  }

  /**
   * Fetch daily step count samples for a date range
   */
  private async fetchStepData(startDate: Date, endDate: Date): Promise<StepSample[]> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getDailyStepCountSamples(
        options,
        (error: string, results: any[]) => {
          if (error) {
            console.error('[HealthDataService] Error fetching step data:', error);
            reject(new Error(error));
            return;
          }

          const stepSamples: StepSample[] = results.map((sample) => ({
            startDate: sample.startDate,
            endDate: sample.endDate,
            value: sample.value,
            metadata: sample.metadata,
          }));

          resolve(stepSamples);
        }
      );
    });
  }

  /**
   * Group data by date
   */
  private groupDataByDate(
    sleepData: SleepSample[],
    heartRateData: HeartRateSample[],
    restingHeartRateData: HeartRateSample[],
    stepData: StepSample[]
  ): Record<string, DailyHealthData> {
    const groupedData: Record<string, DailyHealthData> = {};

    // Helper function to get date key from ISO string
    const getDateKey = (dateString: string): string => {
      return dateString.split('T')[0];
    };

    // Helper function to ensure date entry exists
    const ensureDateExists = (dateKey: string): void => {
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {
          sleep: [],
          heartRate: [],
          restingHeartRate: [],
          steps: { total: 0, samples: [] },
        };
      }
    };

    // Data type configurations for processing
    const dataTypeConfigs = [
      { data: sleepData, key: 'sleep' as const },
      { data: heartRateData, key: 'heartRate' as const },
      { data: restingHeartRateData, key: 'restingHeartRate' as const },
    ];

    // Process regular data types (sleep, heartRate, restingHeartRate)
    dataTypeConfigs.forEach(({ data, key }) => {
      data.forEach((sample) => {
        const dateKey = getDateKey(sample.startDate);
        ensureDateExists(dateKey);
        (groupedData[dateKey][key] as any[]).push(sample);
      });
    });

    // Process step data separately due to its special structure
    stepData.forEach((sample) => {
      const dateKey = getDateKey(sample.startDate);
      ensureDateExists(dateKey);
      groupedData[dateKey].steps.samples.push(sample);
      groupedData[dateKey].steps.total += sample.value;
    });

    return groupedData;
  }


  /**
   * Main function to fetch all health data for a specified number of days
   */
  public async fetchHealthData(
    userId: string,
    daysToFetch: number = 7
  ): Promise<HealthDataJSON> {
    try {
      // Ensure HealthKit is initialized
      if (!this.isInitialized) {
        await this.initializeHealthKit();
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToFetch);
      startDate.setHours(0, 0, 0, 0); // Start of day

      console.log(`[HealthDataService] Fetching data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Fetch all data types in parallel
      const [sleepData, heartRateData, restingHeartRateData, stepData] = await Promise.all([
        this.fetchSleepData(startDate, endDate),
        this.fetchHeartRateData(startDate, endDate),
        this.fetchRestingHeartRateData(startDate, endDate),
        this.fetchStepData(startDate, endDate),
      ]);

      console.log('[HealthDataService] Data fetched successfully:', {
        sleepSamples: sleepData.length,
        heartRateSamples: heartRateData.length,
        restingHeartRateSamples: restingHeartRateData.length,
        stepSamples: stepData.length,
      });

      // Group data by date
      const dailyData = this.groupDataByDate(
        sleepData,
        heartRateData,
        restingHeartRateData,
        stepData
      );

      // Get timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Construct the final JSON structure
      const healthDataJSON: HealthDataJSON = {
        metadata: {
          generatedAt: new Date().toISOString(),
          platform: 'iOS',
          timezone,
          dataRange: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
        },
        userId,
        dailyData,
      };

      console.log('[HealthDataService] Health data prepared for upload:', healthDataJSON);

      return healthDataJSON;
    } catch (error) {
      console.error('[HealthDataService] Error fetching health data:', error);
      throw error;
    }
  }

  /**
   * Convert health data to JSON string for upload
   */
  public convertToJSON(healthData: HealthDataJSON): string {
    return JSON.stringify(healthData, null, 2);
  }

  /**
   * Fetch health data and prepare for upload
   */
  public async prepareHealthDataForUpload(
    userId: string,
    daysToFetch: number = 7
  ): Promise<{ data: HealthDataJSON; jsonString: string }> {
    const healthData = await this.fetchHealthData(userId, daysToFetch);
    const jsonString = this.convertToJSON(healthData);
    console.log('[HealthDataService] Health data JSON string prepared for upload', healthData, jsonString);
    return {
      data: healthData,
      jsonString,
    };
  }
}
"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUserScope } from '@/hooks/use-user-scope';

export interface NavigationItem {
  level: 'national' | 'region' | 'university' | 'member';
  id: number;
  name: string;
  data?: any;
}

export interface NavigationState {
  currentLevel: 'national' | 'region' | 'university' | 'member';
  navigationStack: NavigationItem[];
  isLoading: boolean;
  error: string | null;
}

export interface NavigationActions {
  navigateTo: (level: 'region' | 'university' | 'member', id: number, name: string, data?: any) => void;
  navigateBack: () => void;
  navigateToLevel: (level: 'national' | 'region' | 'university' | 'member') => void;
  clearNavigation: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function useHierarchicalNavigation() {
  const { userScope, loading: scopeLoading } = useUserScope();
  
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentLevel: 'national',
    navigationStack: [],
    isLoading: false,
    error: null
  });

  // Initialize navigation based on user scope
  useEffect(() => {
    if (userScope && !scopeLoading) {
      const initialStack: NavigationItem[] = [];
      let initialLevel: 'national' | 'region' | 'university' | 'member' = 'national';

      switch (userScope.scope) {
        case 'region':
          initialLevel = 'region';
          initialStack.push({
            level: 'region',
            id: userScope.regionId!,
            name: userScope.region?.name || 'Region'
          });
          break;
        case 'university':
          initialLevel = 'university';
          initialStack.push(
            {
              level: 'region',
              id: userScope.regionId!,
              name: userScope.region?.name || 'Region'
            },
            {
              level: 'university',
              id: userScope.universityId!,
              name: userScope.university?.name || 'University'
            }
          );
          break;
        case 'smallgroup':
          initialLevel = 'member';
          initialStack.push(
            {
              level: 'region',
              id: userScope.regionId!,
              name: userScope.region?.name || 'Region'
            },
            {
              level: 'university',
              id: userScope.universityId!,
              name: userScope.university?.name || 'University'
            },
            {
              level: 'member',
              id: userScope.smallGroupId!,
              name: userScope.smallGroup?.name || 'Small Group'
            }
          );
          break;
      }

      setNavigationState(prev => ({
        ...prev,
        currentLevel: initialLevel,
        navigationStack: initialStack
      }));
    }
  }, [userScope, scopeLoading]);

  const navigateTo = useCallback((level: 'region' | 'university' | 'member', id: number, name: string, data?: any) => {
    setNavigationState(prev => {
      let newStack: NavigationItem[];
      let newLevel: 'national' | 'region' | 'university' | 'member';

      switch (level) {
        case 'region':
          newStack = [{ level: 'region', id, name, data }];
          newLevel = 'region';
          break;
        case 'university':
          if (prev.navigationStack.length === 0) {
            throw new Error('Cannot navigate to university without region context');
          }
          newStack = [...prev.navigationStack.slice(0, 1), { level: 'university', id, name, data }];
          newLevel = 'university';
          break;
        case 'member':
          if (prev.navigationStack.length < 2) {
            throw new Error('Cannot navigate to member without university context');
          }
          newStack = [...prev.navigationStack.slice(0, 2), { level: 'member', id, name, data }];
          newLevel = 'member';
          break;
        default:
          throw new Error(`Invalid navigation level: ${level}`);
      }

      return {
        ...prev,
        currentLevel: newLevel,
        navigationStack: newStack,
        error: null
      };
    });
  }, []);

  const navigateBack = useCallback(() => {
    setNavigationState(prev => {
      if (prev.navigationStack.length === 0) {
        return prev; // Already at national level
      }

      const newStack = prev.navigationStack.slice(0, -1);
      let newLevel: 'national' | 'region' | 'university' | 'member';

      if (newStack.length === 0) {
        newLevel = 'national';
      } else if (newStack.length === 1) {
        newLevel = 'region';
      } else if (newStack.length === 2) {
        newLevel = 'university';
      } else {
        newLevel = 'member';
      }

      return {
        ...prev,
        currentLevel: newLevel,
        navigationStack: newStack,
        error: null
      };
    });
  }, []);

  const navigateToLevel = useCallback((level: 'national' | 'region' | 'university' | 'member') => {
    setNavigationState(prev => {
      let newStack: NavigationItem[];
      let newLevel: 'national' | 'region' | 'university' | 'member';

      switch (level) {
        case 'national':
          newStack = [];
          newLevel = 'national';
          break;
        case 'region':
          if (prev.navigationStack.length >= 1) {
            newStack = prev.navigationStack.slice(0, 1);
            newLevel = 'region';
          } else {
            throw new Error('Cannot navigate to region without region context');
          }
          break;
        case 'university':
          if (prev.navigationStack.length >= 2) {
            newStack = prev.navigationStack.slice(0, 2);
            newLevel = 'university';
          } else {
            throw new Error('Cannot navigate to university without university context');
          }
          break;
        case 'member':
          if (prev.navigationStack.length >= 3) {
            newStack = prev.navigationStack.slice(0, 3);
            newLevel = 'member';
          } else {
            throw new Error('Cannot navigate to member without member context');
          }
          break;
        default:
          throw new Error(`Invalid navigation level: ${level}`);
      }

      return {
        ...prev,
        currentLevel: newLevel,
        navigationStack: newStack,
        error: null
      };
    });
  }, []);

  const clearNavigation = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      currentLevel: 'national',
      navigationStack: [],
      error: null
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setNavigationState(prev => ({
      ...prev,
      isLoading: loading
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setNavigationState(prev => ({
      ...prev,
      error
    }));
  }, []);

  // Computed values
  const breadcrumbPath = useMemo(() => {
    const path = ['National'];
    navigationState.navigationStack.forEach(item => {
      path.push(item.name);
    });
    return path;
  }, [navigationState.navigationStack]);

  const canNavigateBack = useMemo(() => {
    return navigationState.navigationStack.length > 0;
  }, [navigationState.navigationStack.length]);

  const currentContext = useMemo(() => {
    const stack = navigationState.navigationStack;
    return {
      region: stack.find(item => item.level === 'region'),
      university: stack.find(item => item.level === 'university'),
      smallGroup: stack.find(item => item.level === 'member')
    };
  }, [navigationState.navigationStack]);

  const navigationParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append('currentLevel', navigationState.currentLevel);
    
    navigationState.navigationStack.forEach((item, index) => {
      params.append(`level${index}Id`, item.id.toString());
    });

    return params.toString();
  }, [navigationState.currentLevel, navigationState.navigationStack]);

  const actions: NavigationActions = {
    navigateTo,
    navigateBack,
    navigateToLevel,
    clearNavigation,
    setLoading,
    setError
  };

  return {
    ...navigationState,
    ...actions,
    breadcrumbPath,
    canNavigateBack,
    currentContext,
    navigationParams,
    isLoading: navigationState.isLoading || scopeLoading
  };
}

// Helper hook for handling row clicks in tables
export function useTableNavigation(onRowClick?: (rowData: any) => void) {
  const { navigateTo, setLoading, setError } = useHierarchicalNavigation();

  const handleRowClick = useCallback(async (rowData: any) => {
    try {
      setLoading(true);
      setError(null);

      // Determine navigation based on current level and row data
      if (rowData.regionId && rowData.region) {
        // Navigate to region level
        navigateTo('region', rowData.regionId, rowData.region, rowData);
      } else if (rowData.universityId && rowData.university) {
        // Navigate to university level
        navigateTo('university', rowData.universityId, rowData.university, rowData);
      } else if (rowData.smallGroupId && rowData.smallGroup) {
        // Navigate to member level
        navigateTo('member', rowData.smallGroupId, rowData.smallGroup, rowData);
      } else {
        // Call custom row click handler if provided
        onRowClick?.(rowData);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      setError(error instanceof Error ? error.message : 'Navigation failed');
    } finally {
      setLoading(false);
    }
  }, [navigateTo, setLoading, setError, onRowClick]);

  return { handleRowClick };
}

// Helper hook for breadcrumb navigation
export function useBreadcrumbNavigation() {
  const { navigateToLevel, navigationStack } = useHierarchicalNavigation();

  const handleBreadcrumbClick = useCallback((index: number) => {
    try {
      if (index === -1) {
        // Click on "National"
        navigateToLevel('national');
      } else if (index === 0) {
        // Click on region
        navigateToLevel('region');
      } else if (index === 1) {
        // Click on university
        navigateToLevel('university');
      } else if (index === 2) {
        // Click on small group
        navigateToLevel('member');
      }
    } catch (error) {
      console.error('Breadcrumb navigation error:', error);
    }
  }, [navigateToLevel, navigationStack]);

  return { handleBreadcrumbClick };
}


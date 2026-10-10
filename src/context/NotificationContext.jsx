import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { notificationAPI } from '../services/api';
import { useAuth } from './AuthContext';


const NotificationContext =
  createContext(null);


export function NotificationProvider({
  children,
}) {

  const {
    isAuthenticated,
    user,
  } = useAuth();


  const [
    notifications,
    setNotifications,
  ] = useState([]);


  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);


  const [
    loading,
    setLoading,
  ] = useState(false);


  // ============================================================
  // CHECK WHETHER CURRENT ACCOUNT IS ADMIN
  // ============================================================

  const isAdmin =
    user?.role === 'admin' ||
    user?.isAdmin === true;


  // ============================================================
  // FETCH NOTIFICATIONS
  // ============================================================

  const fetchNotifications =
    useCallback(async () => {

      if (!isAuthenticated) {

        setNotifications([]);
        setUnreadCount(0);

        return;
      }


      if (isAdmin) {

        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);

        return;
      }


      setLoading(true);


      try {

        const res =
          await notificationAPI.list();


        const notificationList =
          res.data?.notifications || [];


        setNotifications(
          notificationList
        );


        setUnreadCount(
          notificationList.filter(
            (n) => !n.read
          ).length
        );


      } catch (error) {

        console.error(
          'Notification fetch error:',
          error
        );

        setNotifications([]);
        setUnreadCount(0);

      } finally {

        setLoading(false);

      }

    }, [
      isAuthenticated,
      isAdmin,
    ]);


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {

    fetchNotifications();

  }, [
    fetchNotifications,
  ]);


  // ============================================================
  // AUTOMATIC REFRESH
  //
  // Checks for newly created notifications every 15 seconds.
  // ============================================================

  useEffect(() => {

    if (
      !isAuthenticated ||
      isAdmin
    ) {
      return;
    }


    const interval =
      setInterval(() => {

        fetchNotifications();

      }, 15000);


    return () => {

      clearInterval(interval);

    };

  }, [
    isAuthenticated,
    isAdmin,
    fetchNotifications,
  ]);


  // ============================================================
  // MARK ONE NOTIFICATION AS READ
  // ============================================================

  const markRead = async (
    id
  ) => {

    if (isAdmin) return;


    try {

      await notificationAPI.markRead(
        id
      );


      setNotifications(
        (prev) =>
          prev.map((n) =>
            n._id === id
              ? {
                  ...n,
                  read: true,
                }
              : n
          )
      );


      setUnreadCount(
        (count) =>
          Math.max(
            0,
            count - 1
          )
      );


    } catch {

      // Silent failure

    }

  };


  // ============================================================
  // MARK ALL NOTIFICATIONS AS READ
  // ============================================================

  const markAllRead = async () => {

    if (isAdmin) return;


    try {

      await notificationAPI.markAllRead();


      setNotifications(
        (prev) =>
          prev.map((n) => ({
            ...n,
            read: true,
          }))
      );


      setUnreadCount(0);


    } catch {

      // Silent failure

    }

  };


  // ============================================================
  // PROVIDER
  // ============================================================

  return (

    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markRead,
        markAllRead,
      }}
    >

      {children}

    </NotificationContext.Provider>

  );

}


export function useNotifications() {

  const ctx =
    useContext(
      NotificationContext
    );


  if (!ctx) {

    throw new Error(
      'useNotifications must be used within NotificationProvider'
    );

  }


  return ctx;

}
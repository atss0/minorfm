import {useCallback} from 'react';
import {useInfiniteQuery} from '@tanstack/react-query';

interface Options<TItem, TPage> {
  queryKey: readonly unknown[];
  fetcher: (cursor: string | null) => Promise<TPage>;
  getNextCursor: (page: TPage) => string | null | undefined;
  getItems: (page: TPage) => TItem[];
  enabled?: boolean;
  staleTime?: number;
}

export function useInfiniteList<TItem, TPage>({
  queryKey,
  fetcher,
  getNextCursor,
  getItems,
  enabled,
  staleTime,
}: Options<TItem, TPage>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({pageParam}: {pageParam: string | null}) => fetcher(pageParam),
    getNextPageParam: (lastPage: TPage) => getNextCursor(lastPage) ?? null,
    initialPageParam: null as string | null,
    enabled,
    staleTime,
  });

  const items: TItem[] = query.data?.pages.flatMap((page: TPage) => getItems(page)) ?? [];

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  return {
    ...query,
    items,
    onEndReached,
    isLoadingMore: query.isFetchingNextPage,
  };
}

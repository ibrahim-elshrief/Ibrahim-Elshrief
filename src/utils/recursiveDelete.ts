import { 
  collection, 
  doc, 
  getDocs, 
  deleteDoc, 
  writeBatch, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface RecursiveDeleteOptions {
  subcollections?: string[];
  linkedCollections?: {
    collectionName: string;
    foreignKeyField: string;
  }[];
  associatedMediaUrls?: string[];
}

export interface RecursiveDeleteResult {
  success: boolean;
  parentDeleted: boolean;
  subcollectionItemsDeleted: number;
  linkedItemsDeleted: number;
  associatedMediaDeleted: number;
  error?: string;
}

/**
 * Performs recursive deletion of a parent Firestore document and all
 * associated subcollections, linked items, and media records.
 */
export async function deleteDocumentRecursively(
  collectionName: string,
  parentId: string,
  options: RecursiveDeleteOptions = {}
): Promise<RecursiveDeleteResult> {
  const result: RecursiveDeleteResult = {
    success: true,
    parentDeleted: false,
    subcollectionItemsDeleted: 0,
    linkedItemsDeleted: 0,
    associatedMediaDeleted: 0
  };

  try {
    const defaultSubcollections = ['comments', 'media', 'reviews', 'ratings', 'history', 'revisions'];
    const subcolsToCheck = Array.from(new Set([...defaultSubcollections, ...(options.subcollections || [])]));

    // 1. Delete documents from subcollections
    for (const subcol of subcolsToCheck) {
      try {
        const subcolRef = collection(db, collectionName, parentId, subcol);
        const subcolSnap = await getDocs(subcolRef);
        
        if (!subcolSnap.empty) {
          const batch = writeBatch(db);
          subcolSnap.forEach((subDoc) => {
            batch.delete(subDoc.ref);
            result.subcollectionItemsDeleted++;
          });
          await batch.commit();
        }
      } catch (subErr) {
        console.warn(`Subcollection check skipped or not accessible: ${subcol}`, subErr);
      }
    }

    // 2. Delete linked documents in other root collections (foreign keys)
    const linkedCols = options.linkedCollections || [];
    // Always check comments collection for parentId or targetId
    if (!linkedCols.some(l => l.collectionName === 'comments')) {
      linkedCols.push({ collectionName: 'comments', foreignKeyField: 'parentId' });
      linkedCols.push({ collectionName: 'comments', foreignKeyField: 'targetId' });
    }

    for (const { collectionName: linkedColName, foreignKeyField } of linkedCols) {
      try {
        const linkedQuery = query(
          collection(db, linkedColName),
          where(foreignKeyField, '==', parentId)
        );
        const linkedSnap = await getDocs(linkedQuery);
        if (!linkedSnap.empty) {
          const batch = writeBatch(db);
          linkedSnap.forEach((linkedDoc) => {
            batch.delete(linkedDoc.ref);
            result.linkedItemsDeleted++;
          });
          await batch.commit();
        }
      } catch (linkErr) {
        console.warn(`Linked collection query error for ${linkedColName}.${foreignKeyField}:`, linkErr);
      }
    }

    // 3. Clean up associated media records in media collection if requested
    if (options.associatedMediaUrls && options.associatedMediaUrls.length > 0) {
      try {
        const mediaSnap = await getDocs(collection(db, 'media'));
        if (!mediaSnap.empty) {
          const batch = writeBatch(db);
          let mediaCount = 0;
          mediaSnap.forEach((mDoc) => {
            const mData = mDoc.data();
            if (mData.url && options.associatedMediaUrls?.includes(mData.url)) {
              batch.delete(mDoc.ref);
              mediaCount++;
            }
          });
          if (mediaCount > 0) {
            await batch.commit();
            result.associatedMediaDeleted += mediaCount;
          }
        }
      } catch (mediaErr) {
        console.warn('Associated media cleanup error:', mediaErr);
      }
    }

    // 4. Finally delete the parent document
    await deleteDoc(doc(db, collectionName, parentId));
    result.parentDeleted = true;

    return result;
  } catch (err: any) {
    console.error(`Recursive delete failed for ${collectionName}/${parentId}:`, err);
    result.success = false;
    result.error = err?.message || 'Unknown recursive deletion failure';
    throw err;
  }
}

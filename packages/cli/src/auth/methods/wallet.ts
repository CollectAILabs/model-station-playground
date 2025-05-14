import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { EventService } from '@/events/event.service';
import {
	createLdapUserOnLocalDb,
	getUserByEmail,
	getAuthIdentityByLdapId,
	createLdapAuthIdentity,
} from '@/wallet.ee/helpers.ee';
export const handleWalletLogin = async (
	loginId: string,
	password: string,
	address: string,
): Promise<User | undefined> => {
	const walletId = address;
	const walletEmail = `${walletId}@wallet.id`;
	const walletUserInfo: Pick<User, 'email' | 'firstName' | 'lastName'> = {
		email: walletEmail,
		firstName: 'Wallet',
		lastName: 'Wallet',
	};

	const walletAuthIdentity = await getAuthIdentityByLdapId(walletId);
	if (!walletAuthIdentity) {
		const emailUser = await getUserByEmail(walletEmail);

		// check if there is an email user with the same email as the authenticated LDAP user trying to log-in
		if (emailUser && emailUser.email === walletEmail) {
			const identity = await createLdapAuthIdentity(emailUser, walletId);
			// await updateLdapUserOnLocalDb(identity, ldapAttributesValues);
		} else {
			const user = await createLdapUserOnLocalDb(walletUserInfo, walletId);
			Container.get(EventService).emit('user-signed-up', {
				user,
				userType: 'wallet',
				wasDisabledLdapUser: true,
			});
			return user;
		}
	}

	// Retrieve the user again as user's data might have been updated
	return (await getAuthIdentityByLdapId(walletId))?.user;
};

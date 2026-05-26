export class ChatHandler {
  async handle(event: any) {
    console.log('Handling Chat Event:', event.type);
  }
}
export const chatHandler = new ChatHandler();

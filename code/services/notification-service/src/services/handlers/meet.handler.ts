export class MeetHandler {
  async handle(event: any) {
    console.log('Handling Meet Event:', event.type);
  }
}
export const meetHandler = new MeetHandler();
